# Training Monitor - Quick Start Guide

## 🚀 Getting Started

### Access the Training Monitor

1. **Navigate to Training Center**
   ```
   http://localhost:3000/dashboard/training
   ```

2. **Click "Training Monitor"** or navigate to:
   ```
   http://localhost:3000/dashboard/training/monitor
   ```

3. **Select a Training Session** to open the real-time monitor

---

## 📊 Dashboard Overview

### Main Panels

1. **Training Status** - Session info, status, and configuration
2. **Progress Panel** - Epochs, steps, completion percentages
3. **Metrics Charts** - Loss, accuracy, learning rate visualization
4. **Performance** - Throughput metrics (tokens/sec, samples/sec)
5. **Resources** - GPU, RAM, CPU, disk, network usage
6. **Checkpoints** - Latest, best, and upcoming checkpoints
7. **Live Logs** - Real-time log streaming with filtering
8. **Timeline** - Chronological training events
9. **Alerts** - Critical notifications and warnings

### Tabs

- **Overview** - Summary of all metrics
- **Metrics** - Detailed metric visualizations
- **Resources** - Comprehensive resource breakdown
- **Logs** - Searchable log viewer with export
- **Timeline** - Event history

---

## 🔄 Real-Time Updates

### WebSocket Connection

The monitor automatically connects via WebSocket and updates every 2 seconds.

**Connection Status**: Look for the green "🟢 Live" badge in the top right.

### Manual Refresh

Click the **"Refresh"** button to manually fetch the latest data.

---

## 📥 Exporting Logs

### Quick Export

1. Click **"Export Logs"** button (top right)
2. Choose format in dropdown or use buttons in Logs tab
3. File downloads automatically

### Export Formats

- **JSON** - Structured data with full details
- **CSV** - Tabular format for spreadsheets
- **TXT** - Plain text for quick viewing

### Log Filtering

Before exporting:
1. Select **log level** (INFO, WARNING, ERROR, etc.)
2. Use **search** to find specific messages
3. Export applies current filters

---

## 🔍 Searching and Filtering

### Logs Tab

- **Search**: Type keywords in search box
- **Filter by Level**: Use dropdown to select log level
- **Results**: Shows matching log count

### Sessions List

- **Search**: Filter sessions by name or identifier
- **Status Badges**: Color-coded status indicators

---

## 📈 Understanding Metrics

### Training Metrics

- **Training Loss**: Should decrease over time (lower is better)
- **Validation Loss**: Should track training loss closely
- **Accuracy**: Should increase over time (higher is better)
- **Learning Rate**: Dynamically adjusted during training
- **Perplexity**: Lower values indicate better language modeling
- **Gradient Norm**: Indicates training stability

### Performance Metrics

- **Tokens/Second**: Training throughput
- **Samples/Second**: Batch processing rate
- **Iterations/Second**: Training step frequency

### Resource Usage

- **GPU**: Graphics processing unit utilization and memory
- **RAM**: System memory usage
- **CPU**: Central processing unit utilization
- **Disk**: Storage usage for checkpoints and logs
- **Network**: Data transfer rate

---

## ⚠️ Alerts and Notifications

### Alert Severity Levels

- **🔵 INFO**: Informational messages
- **🟡 WARNING**: Non-critical issues requiring attention
- **🔴 CRITICAL**: Critical problems requiring immediate action
- **🔴 ERROR**: Error conditions

### Dismissing Alerts

Click the **X** button on any alert to dismiss it.

---

## 🎯 Common Tasks

### Monitor Active Training

1. Open training monitor for active session
2. Keep Overview tab open for summary
3. Watch for alerts in banner
4. Monitor progress percentages

### Debug Training Issues

1. Go to **Logs tab**
2. Filter by **ERROR** or **WARNING**
3. Search for specific error messages
4. Export logs for detailed analysis

### Track Progress

1. Check **Progress Panel** for completion percentages
2. View **estimated remaining time**
3. Monitor **checkpoint progress** for save points

### Review Training History

1. Go to **Timeline tab**
2. View chronological events
3. Check timestamps for bottlenecks

---

## 💡 Tips and Best Practices

### Optimal Monitoring

- Keep monitor open during training
- Check alerts regularly
- Export logs periodically for records
- Monitor resource usage to optimize

### Performance

- WebSocket connection provides real-time updates
- Minimal performance impact on training
- Auto-reconnects if connection drops

### Troubleshooting

**Connection Issues**:
- Check "Live" status badge
- Verify API server is running
- Check browser console for errors

**No Data Displayed**:
- Verify training session exists
- Check user permissions
- Try manual refresh

**Slow Updates**:
- Check network connection
- Verify WebSocket is connected
- Check server load

---

## 🔧 Advanced Features

### Audit Logging

All monitoring activities are logged for compliance:
- Monitor opened
- Session viewed
- Logs exported
- Administrator actions

### Export with Filters

Combine filtering and export:
1. Apply log level filter
2. Enter search term
3. Export filtered results

### Checkpoint Management

Track checkpoint creation:
- Latest checkpoint details
- Best checkpoint (highest metric)
- Progress to next checkpoint
- Estimated save time

---

## 📱 Mobile Access

The Training Monitor is responsive and works on:
- Desktop (optimal experience)
- Tablets (full functionality)
- Mobile devices (view-only recommended)

---

## 🆘 Support

### Common Issues

1. **Cannot see training session**
   - Verify session exists in database
   - Check user company access
   - Refresh session list

2. **WebSocket not connecting**
   - Verify API server running
   - Check CORS settings
   - Ensure token is valid

3. **Export not working**
   - Check browser download settings
   - Verify sufficient permissions
   - Try different export format

### Getting Help

1. Check browser console for errors
2. Review server logs for API issues
3. Verify environment variables are set
4. Ensure all dependencies are installed

---

## ⚙️ Configuration

### Default Settings

- **Update Interval**: 2 seconds
- **Max Logs Displayed**: 100
- **Log Retention**: 90 days
- **WebSocket Timeout**: 30 seconds

### Customization

Settings can be adjusted in:
- Backend: `training-monitor.gateway.ts`
- Frontend: `useTrainingMonitor.ts`

---

## 📝 Notes

- Currently displays **mock/placeholder data**
- Real metrics available when training engine integrated
- Resource values are estimates (no hardware integration)
- Notifications are architectural placeholders

---

## ✅ Quick Reference

### Keyboard Shortcuts

- None currently (future enhancement)

### API Endpoints

- Status: `GET /api/training/monitor/status/:sessionId`
- Logs: `GET /api/training/monitor/logs/:sessionId`
- Export: `POST /api/training/monitor/logs/:sessionId/export`

### WebSocket Events

- Subscribe: `subscribe`
- Status Update: `training:status`
- Log Entry: `training:log`
- Alert: `training:alerts`

---

**Ready to Monitor!** 🎉

Navigate to `/dashboard/training/monitor` to start monitoring your AI training sessions.
