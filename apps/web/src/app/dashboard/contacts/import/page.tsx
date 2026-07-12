'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UploadCloud, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ImportContactsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/contacts/template`, '_blank');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contacts/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setResult(data.data);
        toast({ description: 'File processed successfully' });
      } else {
        throw new Error(data.message || data.error?.message || 'Failed to upload file');
      }
    } catch (error: any) {
      toast({ description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Import Contacts</h2>
          <p className="text-muted-foreground">Upload CSV or Excel files to add multiple contacts</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              We support .csv and .xlsx files. Make sure your file follows the correct template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center bg-accent/50 p-4 rounded-lg border border-dashed">
              <div className="flex items-center gap-3">
                <FileType className="h-6 w-6 text-primary" />
                <div>
                  <h4 className="font-medium">Download Template</h4>
                  <p className="text-sm text-muted-foreground">Use our template to ensure successful import</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleDownloadTemplate}>Download CSV</Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-10 text-center flex flex-col items-center justify-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a file to upload</h3>
              <p className="text-sm text-muted-foreground mb-4">Max file size 10MB</p>
              
              <Input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="max-w-xs cursor-pointer"
              />
              
              {file && (
                <div className="mt-4 p-2 bg-secondary rounded text-sm text-secondary-foreground font-medium">
                  Selected: {file.name}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild disabled={loading}>
              <Link href="/dashboard/contacts">Cancel</Link>
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? 'Uploading...' : 'Import Contacts'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Import Complete
            </CardTitle>
            <CardDescription>Here is the summary of your import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary p-4 rounded-lg text-center">
                <p className="text-3xl font-bold">{result.totalRows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.imported}</p>
                <p className="text-sm text-muted-foreground">Imported successfully</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{result.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicates skipped</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.invalid}</p>
                <p className="text-sm text-muted-foreground">Invalid rows</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-6 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg p-4 max-h-[300px] overflow-auto">
                <h4 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-3">
                  <AlertCircle className="h-5 w-5" /> Error Log
                </h4>
                <ul className="space-y-2 text-sm text-red-600 dark:text-red-300">
                  {result.errors.map((err: any, idx: number) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button asChild>
              <Link href="/dashboard/contacts">Back to Contacts</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
