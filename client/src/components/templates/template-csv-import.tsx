import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export function TemplateCsvImport({ 
  open, 
  onOpenChange,
  onSuccess,
  onError
}: { 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (templateId: number) => void;
  onError?: (error: Error) => void;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Check if it's a CSV file
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !templateName) {
        throw new Error("File and template name are required");
      }

      setIsUploading(true);
      console.log("Starting CSV upload for template:", templateName);
      
      const formData = new FormData();
      // Important: The name 'file' must match what the server expects
      formData.append("file", file, file.name);
      formData.append("name", templateName);
      formData.append("description", templateDesc || "");
      
      // Convert form data to string for debugging
      let formEntries = [];
      for (let pair of formData.entries()) {
        if (pair[0] === 'file') {
          formEntries.push(`${pair[0]}: [File ${pair[1].name}, ${pair[1].size} bytes]`);
        } else {
          formEntries.push(`${pair[0]}: ${pair[1]}`);
        }
      }
      console.log("Form data entries:", formEntries);
      
      try {
        console.log("Sending CSV file:", file.name, "size:", file.size);
        
        // Use XMLHttpRequest instead of fetch for better control over the upload
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.open('POST', '/api/task-templates/import', true);
          xhr.withCredentials = true; // Include cookies for auth
          
          xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error(`Failed to parse response: ${xhr.responseText}`));
              }
            } else {
              let errorMessage = `Import failed: ${this.status} ${this.statusText}`;
              
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
              } catch (e) {
                // If not valid JSON, use the text directly
                if (xhr.responseText) {
                  errorMessage = xhr.responseText;
                }
              }
              
              reject(new Error(errorMessage));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network error during file upload'));
          };
          
          xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              console.log(`Upload progress: ${percentComplete.toFixed(0)}%`);
            }
          };
          
          xhr.send(formData);
        });
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Template imported successfully",
      });
      
      // Reset the form
      setFile(null);
      setTemplateName("");
      setTemplateDesc("");
      
      // Close the dialog if using dialog mode
      if (onOpenChange) {
        onOpenChange(false);
      }
      
      // Call onSuccess callback if provided
      if (onSuccess && data?.id) {
        onSuccess(data.id);
      }
      
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(error);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    importMutation.mutate();
  };

  // For standalone mode (no dialog wrapper)
  if (!open && !onOpenChange) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateName" className="text-right">
              Template Name
            </Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateDesc" className="text-right">
              Description
            </Label>
            <Input
              id="templateDesc"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csvFile" className="text-right">
              CSV File
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="col-span-3"
              required
            />
          </div>
          {file && (
            <div className="bg-muted p-3 rounded">
              Selected file: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={!file || !templateName || isUploading || importMutation.isPending}
          >
            {isUploading || importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </div>
      </form>
    );
  }

  // For dialog mode
  return (
    <Dialog open={!!open} onOpenChange={(value) => {
      if (onOpenChange) onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Template from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create a new template with tasks.
            <br /><br />
            <strong>Required CSV Format:</strong>
            <br />
            title, description, phase, category, daysFromStart, assignedTo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="templateName" className="text-right">
                Template Name
              </Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="templateDesc" className="text-right">
                Description
              </Label>
              <Input
                id="templateDesc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="csvFile" className="text-right">
                CSV File
              </Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="col-span-3"
                required
              />
            </div>
            {file && (
              <div className="bg-muted p-3 rounded">
                Selected file: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              if (onOpenChange) onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!file || !templateName || isUploading || importMutation.isPending}
            >
              {isUploading || importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}