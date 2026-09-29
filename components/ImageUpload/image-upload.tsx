"use client";

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
);

interface ImageUploadProps {
  label: string;
  onFileSelected: (file: File | null) => void;
  showPreview?: boolean;
}

// selector de imagen con FilePond — todavía no guarda nada, solo entrega el archivo elegido
export function ImageUpload({ label, onFileSelected, showPreview = true }: ImageUploadProps) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <FilePond
        allowMultiple={false}
        allowProcess={false}
        allowImagePreview={showPreview}
        acceptedFileTypes={["image/png", "image/jpeg", "image/webp"]}
        maxFileSize="3MB"
        labelIdle='Arrastra una imagen o <span class="filepond--label-action">explora tus archivos</span>'
        credits={false}
        onupdatefiles={(fileItems) => {
          const file = fileItems[0]?.file;
          onFileSelected(file instanceof File ? file : null);
        }}
      />
    </div>
  );
}
