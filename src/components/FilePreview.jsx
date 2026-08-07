import React from "react";
import { Download } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function FilePreview({ fileUrl, fileName, className }) {
  if (!fileUrl) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
  const isPdf = /\.pdf$/i.test(fileUrl);

  if (isImage) {
    return (
      <div className={`rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center ${className || ""}`}>
        <img src={fileUrl} alt={fileName || "File"} className="w-full h-auto max-h-96 object-contain" />
      </div>
    );
  }
  if (isPdf) {
    return <iframe src={fileUrl} title={fileName || "PDF"} className={`w-full h-96 rounded-lg border border-border ${className || ""}`} />;
  }
  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 text-sm text-primary hover:underline ${className || ""}`}>
      <Download className="w-4 h-4" /> {fileName || "Download file"}
    </a>
  );
}