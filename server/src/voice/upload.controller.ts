import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, promises as fsPromises } from 'fs'; // ✅ FIXED: Combined import
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceUploadController {
  constructor(private configService: ConfigService) {
    // ✅ Configure Cloudinary if credentials exist
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    if (cloudName) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: this.configService.get('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
      });
      console.log('☁️ Cloudinary configured');
    } else {
      console.log('📁 Using local file storage (no Cloudinary)');
    }
  }

  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('audio/')) {
          return cb(
            new BadRequestException('Only audio files are allowed'),
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

    console.log('📥 Received audio file:', {
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    // ✅ Option 1: Upload to Cloudinary (if configured)
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');

    if (cloudName) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            resource_type: 'video', // Audio is treated as video
            folder: 'voice_messages',
            format: 'mp3',
            upload_preset: this.configService.get('CLOUDINARY_UPLOAD_PRESET'),
          },
        );

        console.log('✅ Uploaded to Cloudinary:', result.secure_url);

        return {
          url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration,
          format: result.format,
        };
      } catch (error) {
        console.error('❌ Cloudinary upload failed:', error);
        // Fall back to local storage
        console.log('📁 Falling back to local storage...');
      }
    }

    // ✅ Option 2: Save locally (fallback or default)
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'audio');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${uuidv4()}-${Date.now()}${extname(file.originalname) || '.webm'}`;
      const filePath = join(uploadDir, filename);

      // ✅ Write file to disk using fsPromises
      await fsPromises.writeFile(filePath, file.buffer);

      console.log('✅ Saved locally:', filePath);

      return {
        url: `/uploads/audio/${filename}`,
        filename: filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('❌ Local save failed:', error);
      throw new BadRequestException('Failed to save audio file');
    }
  }
}
