import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebase';
import imageCompression from 'browser-image-compression';

// ========================================
// Image Compression (Zero Vercel Cost)
// ========================================

export interface CompressionOptions {
  maxSizeMB?: number;        // ขนาดไฟล์สูงสุด (default: 0.5MB)
  maxWidthOrHeight?: number; // ขนาดกว้าง/สูงสูงสุด (default: 1024px)
  useWebWorker?: boolean;    // ใช้ Web Worker (default: true)
}

/**
 * บีบอัดรูปภาพก่อนอัปโหลด
 * ใช้ browser-image-compression เพื่อลดขนาดไฟล์
 * ทำงานบน Client-side ไม่เปลือง Server
 */
export async function compressImage(
  file: File, 
  options?: CompressionOptions
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.5,          // 500KB
    maxWidthOrHeight: 1024,  // 1024px
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, {
      ...defaultOptions,
      ...options,
    });
    
    console.log(`📸 บีบอัดรูปจาก ${(file.size / 1024).toFixed(0)}KB เหลือ ${(compressedFile.size / 1024).toFixed(0)}KB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // ถ้าบีบอัดไม่ได้ ให้ใช้ไฟล์เดิม
    return file;
  }
}

// ========================================
// Upload Functions
// ========================================

/**
 * อัปโหลดรูปไป Firebase Storage
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * อัปโหลดรูปของเจอ พร้อมบีบอัดอัตโนมัติ
 */
export async function uploadFoundItemImage(
  file: File, 
  itemId: string,
  compress: boolean = true
): Promise<string> {
  // บีบอัดรูปก่อนอัปโหลด (ถ้าเปิดใช้งาน)
  const fileToUpload = compress ? await compressImage(file) : file;
  
  const extension = 'jpg'; // บังคับใช้ jpg หลังบีบอัด
  const path = `found-items/${itemId}/${Date.now()}.${extension}`;
  
  return uploadImage(fileToUpload, path);
}

/**
 * อัปโหลดรูป Avatar
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  const compressedFile = await compressImage(file, {
    maxSizeMB: 0.2,         // Avatar เล็กลง 200KB
    maxWidthOrHeight: 256,  // 256x256
  });
  
  const path = `avatars/${userId}/${Date.now()}.jpg`;
  return uploadImage(compressedFile, path);
}

// ========================================
// Delete Functions
// ========================================

/**
 * ลบรูปจาก Firebase Storage
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

/**
 * ลบรูปจาก path
 */
export async function deleteImageByPath(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}
