"use client";

import Image from "next/image";
import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploaderProps {
  onFileSelect: (file: File, preview: string) => void;
  isDisabled?: boolean;
  currentPreview?: string | null;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function ImageUploader({
  onFileSelect,
  isDisabled,
  currentPreview,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload an image (JPEG, PNG, WEBP) or PDF";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 20MB";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onFileSelect(file, "/pdf-placeholder.png");
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isDisabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-[#bf1f24] bg-[#bf1f24]/10 shadow-xl"
              : "border-gray-300 hover:border-[#0b1f40]"
          }
          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
          ${currentPreview ? "bg-gray-50" : "bg-white"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          accept="image/*,application/pdf"
          className="hidden"
          disabled={isDisabled}
        />

        {currentPreview ? (
          <div className="space-y-4">
            <div className="max-w-md mx-auto">
              <Image
                src={currentPreview as string}
                alt="Preview"
                width={350}
                height={500}
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
            <p className="text-sm text-gray-600">
              Click or drag to change image
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-[#0b1f40]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#0b1f40] tracking-wide">
                Drop your PSA card image here
              </p>
              <p className="text-sm text-gray-500 mt-2">or click to browse</p>
            </div>
            <p className="text-xs text-gray-400">
              Supports: JPEG, PNG, WEBP, PDF (max 20MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
