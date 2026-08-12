import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, promises as fsPromises } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private isCloudinaryConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    this.logger.log('🔍 Cloudinary Configuration Check:');
    this.logger.log(`📁 Cloud Name: ${cloudName || 'MISSING'}`);
    this.logger.log(`🔑 API Key: ${apiKey ? '✅ Present' : '❌ MISSING'}`);
    this.logger.log(
      `🔐 API Secret: ${apiSecret ? '✅ Present' : '❌ MISSING'}`,
    );

    if (cloudName && apiKey && apiSecret) {
      try {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        this.isCloudinaryConfigured = true;
        this.logger.log('☁️ Cloudinary configured successfully');
      } catch (error: any) {
        this.logger.error('❌ Cloudinary config failed:', error.message);
      }
    } else {
      this.logger.warn(
        '⚠️ Cloudinary credentials missing, using local storage only',
      );
    }
  }

  // ============================
  // ✅ UPLOAD IMAGE
  // ============================

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
      fileFilter: (req, file, cb) => {
        const mimetype = file?.mimetype || '';
        const filename = file?.originalname || 'unknown';
        const logger = new Logger('FileFilter');

        logger.log(`🔍 Image upload attempt - Mimetype: ${mimetype}`);
        logger.log(`🔍 Image upload attempt - Filename: ${filename}`);

        if (!mimetype.startsWith('image/')) {
          logger.error(`❌ Rejected: ${mimetype} is not an image type`);
          return cb(
            new BadRequestException(
              `Only image files are allowed. Received: ${mimetype || 'unknown'}`,
            ),
            false,
          );
        }
        logger.log('✅ Image type accepted');
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const logger = this.logger;
    logger.log('📥 uploadImage() called');

    if (!file) {
      logger.error('❌ No file received');
      throw new BadRequestException('No image file provided');
    }

    const filename = file.originalname || 'image';
    const size = file.size || 0;
    const mimetype = file.mimetype || 'image/jpeg';
    const buffer = file.buffer;

    logger.log(`📥 Received image: ${filename} (${size} bytes, ${mimetype})`);

    const uploadPreset =
      this.configService.get('CLOUDINARY_UPLOAD_PRESET_IMAGE') ||
      'lingoverse_chat_images';

    logger.log(`📋 Using upload preset: ${uploadPreset}`);
    logger.log(`☁️ Cloudinary configured: ${this.isCloudinaryConfigured}`);

    // ✅ TRY CLOUDINARY FIRST
    if (this.isCloudinaryConfigured) {
      try {
        logger.log(`☁️ Uploading to Cloudinary with preset: ${uploadPreset}`);

        const result = await cloudinary.uploader.upload(
          `data:${mimetype};base64,${buffer.toString('base64')}`,
          {
            resource_type: 'auto',
            folder: 'lingoverse_chat_images',
            upload_preset: uploadPreset,
            transformation: [
              { quality: 'auto:best' },
              { fetch_format: 'auto' },
            ],
          },
        );

        logger.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        };
      } catch (error: any) {
        logger.error(`❌ Cloudinary image upload failed: ${error.message}`);
        logger.error(`📋 Full error: ${JSON.stringify(error, null, 2)}`);

        if (error.message?.includes('upload preset')) {
          logger.error(
            `⚠️ Please create upload preset "${uploadPreset}" in Cloudinary with "Unsigned" mode`,
          );
        }
        if (error.message?.includes('Invalid')) {
          logger.error(
            `⚠️ The preset "${uploadPreset}" might not exist or has wrong configuration`,
          );
        }
        // Fall through to local storage
      }
    } else {
      logger.warn('⚠️ Cloudinary not configured, using local storage');
    }

    // ✅ FALLBACK: Save locally
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'images');
      if (!existsSync(uploadDir)) {
        await fsPromises.mkdir(uploadDir, { recursive: true });
        logger.log(`📁 Created directory: ${uploadDir}`);
      }

      const ext = extname(filename) || '.jpg';
      const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
      const filePath = join(uploadDir, uniqueFilename);
      await fsPromises.writeFile(filePath, buffer);

      logger.log(`✅ Image saved locally: ${filePath}`);

      return {
        success: true,
        url: `/uploads/images/${uniqueFilename}`,
        filename: uniqueFilename,
        size: size,
        mimetype: mimetype,
      };
    } catch (error: any) {
      logger.error(`❌ Local save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save image: ${error.message}`);
    }
  }

  // ============================
  // ✅ UPLOAD AUDIO / VOICE
  // ============================

  @Post('audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, cb) => {
        const mimetype = file?.mimetype || '';
        if (!mimetype.startsWith('audio/')) {
          return cb(
            new BadRequestException(
              `Only audio files are allowed. Received: ${mimetype || 'unknown'}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    const filename = file.originalname || 'audio';
    const size = file.size || 0;
    const mimetype = file.mimetype || 'audio/webm';
    const buffer = file.buffer;

    this.logger.log(
      `📥 Received audio: ${filename} (${size} bytes, ${mimetype})`,
    );

    const uploadPreset =
      this.configService.get('CLOUDINARY_UPLOAD_PRESET_VOICE') ||
      'lingoverse_voice_messages';

    if (this.isCloudinaryConfigured) {
      try {
        this.logger.log(
          `☁️ Uploading audio to Cloudinary with preset: ${uploadPreset}`,
        );

        const result = await cloudinary.uploader.upload(
          `data:${mimetype};base64,${buffer.toString('base64')}`,
          {
            resource_type: 'video',
            folder: 'lingoverse_voice_messages',
            format: 'mp3',
            upload_preset: uploadPreset,
            audio: {
              codec: 'aac',
              bitrate: '128k',
            },
            overwrite: true,
            unique_filename: true,
          },
        );

        this.logger.log(
          `✅ Audio uploaded to Cloudinary: ${result.secure_url}`,
        );

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration,
          format: result.format,
        };
      } catch (error: any) {
        this.logger.error(
          `❌ Cloudinary audio upload failed: ${error.message}`,
        );
      }
    }

    // Fallback local
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'audio');
      if (!existsSync(uploadDir)) {
        await fsPromises.mkdir(uploadDir, { recursive: true });
      }

      const ext = extname(filename) || '.webm';
      const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
      const filePath = join(uploadDir, uniqueFilename);
      await fsPromises.writeFile(filePath, buffer);

      this.logger.log(`✅ Audio saved locally: ${filePath}`);

      return {
        success: true,
        url: `/uploads/audio/${uniqueFilename}`,
        filename: uniqueFilename,
        size: size,
        mimetype: mimetype,
      };
    } catch (error: any) {
      this.logger.error(`❌ Local save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save audio: ${error.message}`);
    }
  }

  // ============================
  // ✅ UPLOAD VIDEO
  // ============================

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
      },
      fileFilter: (req, file, cb) => {
        const mimetype = file?.mimetype || '';
        if (!mimetype.startsWith('video/')) {
          return cb(
            new BadRequestException(
              `Only video files are allowed. Received: ${mimetype || 'unknown'}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }

    const filename = file.originalname || 'video';
    const size = file.size || 0;
    const mimetype = file.mimetype || 'video/mp4';
    const buffer = file.buffer;

    this.logger.log(
      `📥 Received video: ${filename} (${size} bytes, ${mimetype})`,
    );

    const uploadPreset =
      this.configService.get('CLOUDINARY_UPLOAD_PRESET_VIDEO') ||
      'lingoverse_chat_videos';

    if (this.isCloudinaryConfigured) {
      try {
        this.logger.log(
          `☁️ Uploading video to Cloudinary with preset: ${uploadPreset}`,
        );

        const result = await cloudinary.uploader.upload(
          `data:${mimetype};base64,${buffer.toString('base64')}`,
          {
            resource_type: 'video',
            folder: 'lingoverse_chat_videos',
            upload_preset: uploadPreset,
            transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
          },
        );

        this.logger.log(
          `✅ Video uploaded to Cloudinary: ${result.secure_url}`,
        );

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration,
          width: result.width,
          height: result.height,
        };
      } catch (error: any) {
        this.logger.error(
          `❌ Cloudinary video upload failed: ${error.message}`,
        );
      }
    }

    // Fallback local
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'videos');
      if (!existsSync(uploadDir)) {
        await fsPromises.mkdir(uploadDir, { recursive: true });
      }

      const ext = extname(filename) || '.mp4';
      const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
      const filePath = join(uploadDir, uniqueFilename);
      await fsPromises.writeFile(filePath, buffer);

      this.logger.log(`✅ Video saved locally: ${filePath}`);

      return {
        success: true,
        url: `/uploads/videos/${uniqueFilename}`,
        filename: uniqueFilename,
      };
    } catch (error: any) {
      this.logger.error(`❌ Local save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save video: ${error.message}`);
    }
  }

  // ============================
  // ✅ UPLOAD DOCUMENT / FILE
  // ============================

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        const mimetype = file?.mimetype || '';
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-zip-compressed',
          'application/x-rar-compressed',
        ];
        if (!allowedTypes.includes(mimetype)) {
          return cb(
            new BadRequestException(
              `Only documents are allowed (PDF, DOC, XLS, PPT, TXT, ZIP). Received: ${mimetype || 'unknown'}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const filename = file.originalname || 'file';
    const size = file.size || 0;
    const mimetype = file.mimetype || 'application/octet-stream';
    const buffer = file.buffer;

    this.logger.log(
      `📥 Received file: ${filename} (${size} bytes, ${mimetype})`,
    );

    const uploadPreset =
      this.configService.get('CLOUDINARY_UPLOAD_PRESET_FILE') ||
      'lingoverse_chat_files';

    if (this.isCloudinaryConfigured) {
      try {
        this.logger.log(
          `☁️ Uploading file to Cloudinary with preset: ${uploadPreset}`,
        );

        const result = await cloudinary.uploader.upload(
          `data:${mimetype};base64,${buffer.toString('base64')}`,
          {
            resource_type: 'raw',
            folder: 'lingoverse_chat_files',
            upload_preset: uploadPreset,
            use_filename: true,
            unique_filename: true,
          },
        );

        this.logger.log(`✅ File uploaded to Cloudinary: ${result.secure_url}`);

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format,
        };
      } catch (error: any) {
        this.logger.error(`❌ Cloudinary file upload failed: ${error.message}`);
      }
    }

    // Fallback local
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'files');
      if (!existsSync(uploadDir)) {
        await fsPromises.mkdir(uploadDir, { recursive: true });
      }

      const ext = extname(filename) || '';
      const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
      const filePath = join(uploadDir, uniqueFilename);
      await fsPromises.writeFile(filePath, buffer);

      this.logger.log(`✅ File saved locally: ${filePath}`);

      return {
        success: true,
        url: `/uploads/files/${uniqueFilename}`,
        filename: uniqueFilename,
        size: size,
      };
    } catch (error: any) {
      this.logger.error(`❌ Local save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save file: ${error.message}`);
    }
  }

  // ============================
  // ✅ UPLOAD AVATAR (Profile Picture)
  // ============================

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const mimetype = file?.mimetype || '';
        if (!mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException(
              `Only image files are allowed for avatar. Received: ${mimetype || 'unknown'}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const filename = file.originalname || 'avatar';
    const size = file.size || 0;
    const mimetype = file.mimetype || 'image/jpeg';
    const buffer = file.buffer;

    this.logger.log(`📥 Received avatar: ${filename} (${size} bytes)`);

    const uploadPreset =
      this.configService.get('CLOUDINARY_UPLOAD_PRESET_AVATAR') ||
      'lingoverse_user_avatars';

    if (this.isCloudinaryConfigured) {
      try {
        this.logger.log(
          `☁️ Uploading avatar to Cloudinary with preset: ${uploadPreset}`,
        );

        const result = await cloudinary.uploader.upload(
          `data:${mimetype};base64,${buffer.toString('base64')}`,
          {
            resource_type: 'image',
            folder: 'lingoverse_user_avatars',
            upload_preset: uploadPreset,
            transformation: [
              { width: 400, height: 400, crop: 'thumb', gravity: 'face' },
              { quality: 'auto:best' },
              { fetch_format: 'auto' },
            ],
          },
        );

        this.logger.log(
          `✅ Avatar uploaded to Cloudinary: ${result.secure_url}`,
        );

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
        };
      } catch (error: any) {
        this.logger.error(
          `❌ Cloudinary avatar upload failed: ${error.message}`,
        );
      }
    }

    // Fallback local
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'avatars');
      if (!existsSync(uploadDir)) {
        await fsPromises.mkdir(uploadDir, { recursive: true });
      }

      const ext = extname(filename) || '.jpg';
      const uniqueFilename = `${uuidv4()}-${Date.now()}${ext}`;
      const filePath = join(uploadDir, uniqueFilename);
      await fsPromises.writeFile(filePath, buffer);

      this.logger.log(`✅ Avatar saved locally: ${filePath}`);

      return {
        success: true,
        url: `/uploads/avatars/${uniqueFilename}`,
        filename: uniqueFilename,
      };
    } catch (error: any) {
      this.logger.error(`❌ Local save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save avatar: ${error.message}`);
    }
  }
}
