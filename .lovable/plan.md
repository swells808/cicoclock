
## Sort Employee Hours Report Alphabetically

**What's happening:** The Employee Hours report currently sorts employees by total hours (highest first). You want them sorted alphabetically by name.

**The fix:** One line change in `src/pages/Reports.tsx` at line 1402.

### Technical Details

Change the sort on line 1402 from:
```
.sort((a, b) => b.hours - a.hours)
```
to:
```
.sort((a, b) => a.name.localeCompare(b.name))
```

This will display employees in A-Z order by their full name.
