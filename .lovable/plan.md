

## CSV Import for Clients and Projects/Jobs

Add CSV upload buttons to both the Clients and Projects pages, following the same pattern already used for importing Users.

### What You'll Get

- An "Import CSV" button on the **Clients** page (next to "Add Client")
- An "Import CSV" button on the **Projects/Jobs** page (next to "New Job")
- Each opens a modal where you pick a CSV file, preview the data, and confirm the import

### CSV Column Formats

**Clients CSV columns:**
- Required: `company_name`
- Optional: `contact_person_name`, `contact_person_title`, `email`, `phone`, `street_address`, `city`, `state_province`, `postal_code`, `country`, `notes`

**Projects/Jobs CSV columns:**
- Required: `name`
- Optional: `project_number`, `address`, `description`

### Technical Details

**New files to create:**

1. **`src/components/clients/ClientCSVImportModal.tsx`** -- Modal component for importing clients via CSV. Follows the same structure as the existing `CSVImportModal` for users:
   - File picker with drag area
   - PapaParse for CSV parsing
   - Validates that `company_name` is present in each row
   - Preview table showing company_name, contact_person_name, email, phone
   - Inserts rows into the `clients` table with the current `company_id`
   - Shows success/error toast on completion

2. **`src/components/projects/ProjectCSVImportModal.tsx`** -- Modal component for importing projects/jobs via CSV. Same structure:
   - Validates that `name` is present in each row
   - Preview table showing name, project_number, address
   - Inserts rows into the `projects` table with the current `company_id`
   - Shows success/error toast on completion

**Files to modify:**

3. **`src/pages/Clients.tsx`**
   - Add state for `isCSVImportOpen`
   - Add an "Import CSV" button next to the existing "Add Client" button
   - Render `ClientCSVImportModal` with `onImportComplete` calling `refetch`

4. **`src/pages/Projects.tsx`**
   - Add state for `isCSVImportOpen`
   - Add an "Import CSV" button next to the existing "New Job" button
   - Render `ProjectCSVImportModal` with `onImportComplete` triggering a query invalidation via the existing `useProjects` hook

No database changes are needed -- the `clients` and `projects` tables already have all the required columns.
