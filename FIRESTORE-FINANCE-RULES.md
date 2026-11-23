# Firestore security rules for SiteCommand Finances

Merge the following match block **inside** your existing `match /databases/{database}/documents` block in Firebase Console → Firestore Database → Rules. Do not replace your existing rules.

```javascript
match /contractors/{contractorId}/financeRecords/{recordId} {
  allow read, write: if request.auth != null
    && request.auth.uid == contractorId
    && recordId.matches('^(txn_|prj_)[A-Za-z0-9_-]{1,120}$')
    && (request.method == 'delete' ||
        (request.resource.data.keys().hasOnly(['record','updatedAt'])
         && request.resource.data.record is map
         && request.resource.data.record.id is string
         && request.resource.data.record.id.size() <= 120));
}
```

Publish the rules separately; GitHub Pages deployment does not publish Firestore rules. Check for overlapping broader allow rules (Firestore ORs overlapping allows). Test signed-in owner reads/writes and denied reads/writes from another contractor. Until sync status says cloud saved, export a backup and do not clear site data. This is not a banking/accounting system.
