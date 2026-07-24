'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, TrendingUp, AlertCircle, Users, Target } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [intentData, setIntentData] = useState<any[]>([]);
  const [objectionData, setObjectionData] = useState<any[]>([]);
  const [leadData, setLeadData] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [emotionData, setEmotionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

      const [intents, objections, leads, trends, quality, emotions] = await Promise.all([
        fetch('/api/v1/conversation-intelligence/analytics/intent-distribution', {
          headers,
        }).then((r) => r.json()),
        fetch('/api/v1/conversation-intelligence/analytics/objection-distribution', {
          headers,
        }).then((r) => r.json()),
        fetch('/api/v1/conversation-intelligence/analytics/lead-distribution', {
          headers,
        }).then((r) => r.json()),
        fetch('/api/v1/conversation-intelligence/analytics/trends', { headers }).then((r) =>
          r.json()
        ),
        fetch('/api/v1/conversation-intelligence/analytics/quality-distribution', {
          headers,
        }).then((r) => r.json()),
        fetch('/api/v1/conversation-intelligence/analytics/emotion-distribution', {
          headers,
        }).then((r) => r.json()),
      ]);

      setIntentData(intents || []);
      setObjectionData(objections || []);
      setLeadData(leads || []);
      setTrendsData(trends || []);
      setQualityData(quality || []);
      setEmotionData(emotions || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/conversation-intelligence')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conversation Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Insights and trends from conversation analysis
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="intents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="intents">
            <TrendingUp className="mr-2 h-4 w-4" />
            Intents
          </TabsTrigger>
          <TabsTrigger value="objections">
            <AlertCircle className="mr-2 h-4 w-4" />
            Objections
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Users className="mr-2 h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="trends">
            <Target className="mr-2 h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Intent Distribution */}
        <TabsContent value="intents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Intent Distribution</CardTitle>
                <CardDescription>Frequency of customer intents</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="intentType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intent Confidence</CardTitle>
                <CardDescription>Average confidence by intent type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="intentType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageConfidence" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Intent Table */}
          <Card>
            <CardHeader>
              <CardTitle>Intent Details</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Intent Type</th>
                    <th className="text-right p-2">Count</th>
                    <th className="text-right p-2">Percentage</th>
                    <th className="text-right p-2">Avg. Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {intentData.map((intent, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{intent.intentType}</td>
                      <td className="text-right p-2">{intent.count}</td>
                      <td className="text-right p-2">{intent.percentage.toFixed(1)}%</td>
                      <td className="text-right p-2">
                        {(intent.averageConfidence * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objection Analysis */}
        <TabsContent value="objections" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Objection Types</CardTitle>
                <CardDescription>Most common customer objections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={objectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="objectionType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Rate</CardTitle>
                <CardDescription>How well objections are handled</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={objectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="objectionType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="resolutionRate" fill="#00c49f" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Objection Table */}
          <Card>
            <CardHeader>
              <CardTitle>Objection Details</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Objection Type</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Resolved</th>
                    <th className="text-right p-2">Resolution Rate</th>
                    <th className="text-right p-2">Avg. Score</th>
                  </tr>
                </thead>
                <tbody>
                  {objectionData.map((objection, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{objection.objectionType.replace('_', ' ')}</td>
                      <td className="text-right p-2">{objection.count}</td>
                      <td className="text-right p-2">{objection.resolvedCount}</td>
                      <td className="text-right p-2">{objection.resolutionRate.toFixed(1)}%</td>
                      <td className="text-right p-2">
                        {objection.averageResolutionScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Distribution */}
        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Category Distribution</CardTitle>
                <CardDescription>Breakdown of lead quality</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.leadCategory}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {leadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Lead Scores</CardTitle>
                <CardDescription>Score by lead category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="leadCategory" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageScore" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lead Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Lead Category</th>
                    <th className="text-right p-2">Count</th>
                    <th className="text-right p-2">Percentage</th>
                    <th className="text-right p-2">Avg. Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leadData.map((lead, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{lead.leadCategory.replace('_', ' ')}</td>
                      <td className="text-right p-2">{lead.count}</td>
                      <td className="text-right p-2">{lead.percentage.toFixed(1)}%</td>
                      <td className="text-right p-2">{lead.averageScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Trends Over Time</CardTitle>
              <CardDescription>Performance metrics by date</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalConversations"
                    stroke="#8884d8"
                    name="Total Conversations"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="qualifiedLeadsCount"
                    stroke="#82ca9d"
                    name="Qualified Leads"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#ffc658"
                    name="Avg. Score"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="successRate"
                    stroke="#ff8042"
                    name="Success Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>Conversation quality breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.quality}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotion Distribution</CardTitle>
                <CardDescription>Customer emotions detected</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotionType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8dd1e1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
