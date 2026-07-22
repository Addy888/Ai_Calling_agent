'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Search, Download, Filter, RefreshCw } from 'lucide-react';

interface TrainingLog {
  id: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  details?: any;
  timestamp: string;
}

interface LiveLogsPanelProps {
  logs: TrainingLog[];
  onExport: (format: string) => void;
  sessionId: string;
}

export function LiveLogsPanel({ logs, onExport, sessionId }: LiveLogsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'ERROR':
        return 'bg-red-400 text-white';
      case 'WARNING':
        return 'bg-yellow-500 text-white';
      case 'INFO':
        return 'bg-blue-500 text-white';
      case 'DEBUG':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSearch = searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Live Training Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onExport('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {filteredLogs.length} logs
          </Badge>
        </div>

        {/* Logs Display */}
        <ScrollArea className="h-[600px] rounded-lg border bg-muted/20 p-4">
          <div className="space-y-2 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs match your filters
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <Badge 
                    className={`${getLevelColor(log.level)} text-xs px-2 py-0`}
                  >
                    {log.level}
                  </Badge>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Export Options */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onExport('json')}
            >
              Export JSON
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onExport('csv')}
            >
              Export CSV
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onExport('txt')}
            >
              Export TXT
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
