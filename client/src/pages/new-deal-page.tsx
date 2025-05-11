import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { InsertDeal, insertDealSchema } from "@shared/schema";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Extend the schema with validation
const formSchema = insertDealSchema.extend({
  name: z.string().min(3, {
    message: "Deal name must be at least 3 characters.",
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function NewDealPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Define form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      status: "active",
    },
  });

  // Define mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: InsertDeal) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    createDealMutation.mutate(data);
  };

  return (
    <Layout title="Create New Deal" subtitle="Enter details for the new acquisition or investment opportunity">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
            <CardDescription>
              Fill in the basic information about the new deal. You'll be able to add tasks and details later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TechFusion Acquisition" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mr-2"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDealMutation.isPending}
                  >
                    {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}