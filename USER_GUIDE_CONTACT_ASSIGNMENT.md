# User Guide: Campaign Contact Assignment

## Quick Start

### Creating a Campaign with Contacts

1. **Open Create Campaign Dialog**
   - Navigate to Campaigns page
   - Click "Create Campaign" button
   - Fill in campaign details:
     - Campaign Name (required)
     - Status (Draft/Scheduled/Active)
     - Description
     - Select a Script
     - Select a Prompt
     - Add Notes

2. **Assign Contacts** (NEW - Required)
   
   You have two options:

   #### Option A: Select Existing Contacts
   
   - The **"Select Existing"** tab is active by default
   - Use the search box to find contacts by:
     - Name
     - Phone number
     - Email
     - Company
   - **Select contacts:**
     - Click the checkbox next to each contact
     - OR click "Select all on this page" to select all visible contacts
   - **Navigate pages** if you have more than 20 contacts
   - **View selection:** Selected count shows in the badge at the top
   - **Clear selection:** Click the "Clear" button to deselect all

   #### Option B: Import New Contacts
   
   - Click the **"Import Contacts"** tab
   - **Download template** (optional but recommended):
     - Click "Download Template" button
     - Opens a CSV file with example data
     - Shows required columns and format
   - **Prepare your file:**
     - Format: CSV or Excel (.xlsx, .xls)
     - Required column: `phone` (with country code, e.g., +1234567890)
     - Optional columns: `firstName`, `lastName`, `email`, `language`, `company`, `designation`, `tags`, `notes`
   - **Upload file:**
     - Click "Choose File" button
     - Select your CSV or Excel file
     - Wait for upload to complete
   - **After import:**
     - Success message shows imported count
     - Automatically switches to "Select Existing" tab
     - Your imported contacts appear in the list
     - Select them for this campaign

3. **Validation**
   - ⚠️ You **must** select at least one contact
   - "Create Campaign" button is disabled until you select contacts
   - Error message appears if you try to submit without contacts

4. **Submit**
   - Click "Create Campaign"
   - Success message shows: "Campaign created with X contacts assigned"
   - Campaign appears in the list with correct contact count

## Contact Import Details

### Supported File Formats
- CSV (.csv)
- Excel (.xlsx, .xls)

### Required Fields
- `phone` - Phone number with country code (e.g., +1234567890)

### Optional Fields
- `firstName` - Contact's first name
- `lastName` - Contact's last name
- `email` - Email address
- `language` - Language code (e.g., en, hi, mr)
- `company` - Company name
- `designation` - Job title
- `tags` - Comma-separated tags
- `notes` - Additional notes

### Import Rules
1. **Duplicate Detection**
   - Contacts with duplicate phone numbers are automatically skipped
   - Import summary shows how many duplicates were found

2. **Invalid Rows**
   - Rows without a phone number are skipped
   - Rows with invalid data are reported in the error summary

3. **File Size Limit**
   - Maximum file size: 10MB
   - For larger files, split into multiple uploads

### Example CSV Format
```csv
firstName,lastName,phone,email,language,company,designation,tags,notes
John,Doe,+15551234567,john@example.com,en,Acme Corp,Manager,"lead,b2b",Met at conference
Jane,Smith,+15559876543,jane@example.com,en,Tech Inc,Director,"enterprise,qualified",Interested in product
```

## Starting a Campaign

### Prerequisites
- Campaign must have at least 1 assigned contact
- Contacts must be in ACTIVE status
- Contacts must not be deleted

### Steps
1. Navigate to campaign detail page
2. Review assigned contacts in the contacts tab
3. Click the "Play" or "Resume" button (depending on status)
4. Campaign starts execution:
   - Contacts are loaded
   - Calls are queued
   - Runtime monitor updates

### Error Handling
- ❌ **"This campaign has no assigned contacts"**
  - Solution: Go back to campaign and assign contacts
  - Use "Edit" button or contact management features

## Managing Campaign Contacts

### Viewing Contacts
1. Open campaign detail page
2. Click "Contacts" tab
3. View list of assigned contacts with:
   - Name
   - Phone
   - Email
   - Status
   - Last called date

### Adding More Contacts
1. Edit the campaign
2. Use the Contact Selector
3. Select additional contacts
4. Save changes

### Removing Contacts
1. Edit the campaign
2. Deselect contacts in the Contact Selector
3. Save changes

## Tips and Best Practices

### For Better Results
1. **Clean Your Contact List**
   - Remove duplicates before importing
   - Ensure phone numbers have country codes
   - Validate email addresses

2. **Use Tags**
   - Tag contacts by campaign type, lead quality, or source
   - Makes filtering easier in the future

3. **Test with Small Batches**
   - Start with a small test campaign
   - Verify contacts are working correctly
   - Scale up once confident

4. **Regular Updates**
   - Keep contact information up to date
   - Remove inactive or unresponsive contacts
   - Add notes from previous interactions

### Performance Tips
1. **Large Campaigns**
   - For campaigns with 1000+ contacts, import in batches
   - Monitor system performance during execution
   - Consider using multiple smaller campaigns

2. **Contact Search**
   - Use specific search terms for faster results
   - Filter by status to see only active contacts
   - Navigate pages instead of loading all contacts

## Troubleshooting

### Problem: Cannot Create Campaign
**Error:** "Please select at least one contact"
**Solution:** 
- Make sure you've selected at least one contact in the Contact Selector
- Check that the selected count badge shows a number > 0
- Try clicking a contact checkbox to select it

### Problem: Import Failed
**Error:** "Failed to import contacts"
**Solutions:**
- Check file format (must be CSV or Excel)
- Verify phone column exists and has valid phone numbers
- Check file size (must be under 10MB)
- Try downloading and using the template

### Problem: Cannot Start Campaign
**Error:** "This campaign has no assigned contacts"
**Solutions:**
- Go to campaign edit page
- Assign contacts using Contact Selector
- Verify contacts are in ACTIVE status
- Check that contacts haven't been deleted

### Problem: Contacts Not Showing
**Solutions:**
- Clear search box
- Check status filter
- Verify contacts exist in the Contacts module
- Refresh the page

### Problem: Duplicate Contacts
**Note:** This is expected behavior
**Explanation:**
- Duplicate phone numbers are automatically skipped during import
- Check import summary for duplicate count
- Existing contacts won't be duplicated

## Keyboard Shortcuts

- `Tab` - Navigate between form fields
- `Space` - Toggle checkbox selection
- `Enter` - Submit form (when button is focused)
- `Escape` - Close dialog

## FAQ

**Q: Can I create a campaign without contacts?**
A: No, you must assign at least one contact. This prevents empty campaigns that cannot be executed.

**Q: Can I add contacts to a running campaign?**
A: Currently, you need to pause the campaign, add contacts, and resume. Future updates will support live contact addition.

**Q: What happens to my contacts if I delete a campaign?**
A: Contacts are not deleted. They become unassigned and can be assigned to other campaigns.

**Q: Can I import contacts without immediately assigning them?**
A: Yes, use the Contacts module to import contacts. Then use the campaign Contact Selector to assign them later.

**Q: How do I know if contacts were successfully assigned?**
A: The campaign list shows the exact contact count. You can also view the Contacts tab in the campaign detail page.

**Q: Can one contact be in multiple campaigns?**
A: Currently, a contact can only be assigned to one campaign at a time. Assigning to a new campaign will unassign from the previous campaign.

## Need Help?

If you encounter issues not covered in this guide:
1. Check the campaign detail page for error messages
2. Review the contact status in the Contacts module
3. Check browser console for technical errors
4. Contact support with campaign ID and error details

---

**Version:** 1.0
**Last Updated:** 2025
**Feature:** Campaign Contact Assignment
