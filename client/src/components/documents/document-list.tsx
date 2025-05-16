import { Document } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistance } from "date-fns";
import { FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  documents: Document[];
}

export function DocumentList({ documents }: DocumentListProps) {
  if (!documents || documents.length === 0) {
    return <p className="text-center text-gray-500">No documents found.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <Card key={document.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 p-2 rounded">
                  <FileIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium">{document.fileName}</h3>
                  <p className="text-xs text-gray-500">
                    Uploaded {formatDistance(new Date(document.uploadedAt), new Date(), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <Button size="sm" variant="ghost" className="h-8">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}