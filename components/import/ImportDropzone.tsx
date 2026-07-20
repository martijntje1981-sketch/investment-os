import { UploadCloud } from "lucide-react";

type ImportDropzoneProps = {
  isDragging: boolean;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
};

export function ImportDropzone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: ImportDropzoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`mt-5 rounded-[24px] border-2 border-dashed px-5 py-8 text-center transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-slate-300 bg-white text-slate-500"
      }`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-800">
        Drop a screenshot, Excel or CSV file here
      </p>
      <p className="mt-1 text-xs text-slate-500">
        JPG, PNG, WEBP, XLSX, XLS or CSV
      </p>
    </div>
  );
}
