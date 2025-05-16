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
      
      // Simple upload implementation using basic FormData and fetch
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", templateName);
      formData.append("description", templateDesc || "");
      
      try {
        console.log("Sending CSV file:", file.name, "size:", file.size);
        
        const response = await fetch("/api/task-templates/import", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (!response.ok) {
          let errorText = "";
          try {
            const errorData = await response.json();
            errorText = errorData.message || errorData.error || response.statusText;
          } catch (e) {
            errorText = await response.text() || `Error ${response.status}`;
          }
          throw new Error(errorText);
        }
        
        return await response.json();
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