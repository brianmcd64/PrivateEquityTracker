import { Card, CardContent } from "@/components/ui/card";
import { FileText, FileSpreadsheet, FileArchive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Document } from "@shared/schema";

interface RecentDocumentsProps {
  dealId: number;
}

export function RecentDocuments({ dealId }: RecentDocumentsProps) {
  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: [`/api/deals/${dealId}/recent-documents?limit=4`],
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.endsWith("xlsx") || fileType.endsWith("xls")) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500 mr-3" />;
    } else if (fileType.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500 mr-3" />;
    } else if (fileType.includes("word") || fileType.endsWith("doc") || fileType.endsWith("docx")) {
      return <FileText className="h-5 w-5 text-blue-500 mr-3" />;
    } else {
      return <FileArchive className="h-5 w-5 text-yellow-500 mr-3" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Documents</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Documents</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-red-500">Failed to load documents</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Documents</h3>
        <ul className="space-y-3">
          {documents && documents.map((doc) => (
            <li key={doc.id}>
              <a href="#" className="flex items-center p-2 hover:bg-neutral-50 rounded-md">
                {getFileIcon(doc.fileType)}
                <div>
                  <p className="text-sm font-medium text-neutral-900 line-clamp-1">{doc.fileName}</p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(doc.fileSize)} • {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                  </p>
                </div>
              </a>
            </li>
          ))}
          
          {(!documents || documents.length === 0) && (
            <div className="text-center py-4">
              <p className="text-neutral-500">No documents available</p>
            </div>
          )}
        </ul>
        <button className="mt-4 w-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 py-2 px-4 rounded-md text-sm font-medium">
          View All Documents
        </button>
      </CardContent>
    </Card>
  );
}
