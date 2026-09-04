const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/api/allmotorparks.json'), 'utf8'));
const allParks = raw.data || [];

// 1. Applications with multiple branches (> 1)
const multiBranchApps = allParks.filter(p => p.branches && p.branches.length > 1);

// 2. All strict Mass Transit applications (by name / owner)
const massTransitKeywords = ['mass transit'];
const strictMassTransits = allParks.filter(p => {
  const text = [p.motorParkName, p.ownerName, p.facilityType, ...(p.serviceTypes || [])].join(' ').toLowerCase();
  return massTransitKeywords.some(kw => text.includes(kw));
});

// 3. Broader Transport & Mass Transit operators (including interstate bus companies like GUO, AKTC, ABC, etc.)
const broaderTransportKeywords = ['mass transit', 'transit', 'transport'];
const allTransitsAndTransports = allParks.filter(p => {
  const text = [p.motorParkName, p.ownerName, p.facilityType, ...(p.serviceTypes || [])].join(' ').toLowerCase();
  return broaderTransportKeywords.some(kw => text.includes(kw));
});

// JSON output
const jsonResult = {
  generatedAt: new Date().toISOString(),
  totalRecordsInSource: allParks.length,
  summary: {
    totalApplicationsWithMultipleBranches: multiBranchApps.length,
    totalStrictMassTransitApplications: strictMassTransits.length,
    strictMassTransitsWithMultipleBranches: strictMassTransits.filter(p => p.branches && p.branches.length > 1).length,
    strictMassTransitsWithSingleBranch: strictMassTransits.filter(p => p.branches && p.branches.length === 1).length,
    totalTransportOrTransitApplications: allTransitsAndTransports.length
  },
  multiBranchApplications: multiBranchApps.map(p => ({
    applicationId: p.id,
    formSerialNumber: p.formSerialNumber,
    asinNumber: p.asinNumber,
    dateOfApplication: p.dateOfApplication,
    parkName: p.motorParkName?.trim(),
    ownerName: p.ownerName?.trim(),
    ownershipType: p.ownershipType,
    facilityType: p.facilityType,
    serviceTypes: p.serviceTypes,
    headquarterLocation: {
      physicalLocation: p.physicalLocation?.trim(),
      townCommunity: p.townCommunity?.trim(),
      lgaCode: p.lga,
    },
    contact: {
      phoneNumber: p.phoneNumber,
      alternatePhoneNumber: p.alternatePhoneNumber,
      emailAddress: p.emailAddress,
    },
    totalBranchesCount: p.branches.length,
    branches: p.branches.map((b, idx) => ({
      branchIndex: idx + 1,
      branchId: b.id,
      parentParkId: b.park_id,
      branchName: b.name?.trim(),
      physicalLocation: b.physicalLocation?.trim(),
      lga: b.lga?.trim(),
      townCommunity: b.townCommunity?.trim(),
      facilityType: b.facilityType,
      serviceTypes: b.serviceTypes,
      operationalStatus: b.operationalStatus,
      vehiclesPerDay: b.vehiclesPerDay,
      vehicleTypes: b.vehicleTypes,
    }))
  })),
  strictMassTransitApplications: strictMassTransits.map(p => ({
    applicationId: p.id,
    parkName: p.motorParkName?.trim(),
    ownerName: p.ownerName?.trim(),
    hasMultipleBranches: p.branches && p.branches.length > 1,
    branchCount: p.branches ? p.branches.length : 0,
    physicalLocation: p.physicalLocation?.trim(),
    townCommunity: p.townCommunity?.trim(),
    lgaCode: p.lga,
    branches: (p.branches || []).map(b => ({
      branchId: b.id,
      branchName: b.name?.trim(),
      physicalLocation: b.physicalLocation?.trim(),
      lga: b.lga?.trim(),
      townCommunity: b.townCommunity?.trim()
    }))
  }))
};

fs.writeFileSync(
  path.join(__dirname, '../app/api/applications_with_branches.json'),
  JSON.stringify(jsonResult, null, 2),
  'utf8'
);

// Markdown output
let md = `# Mass Transits & Applications with Branches Report

**Source File**: \`app/api/allmotorparks.json\`  
**Generated At**: ${new Date().toISOString()}  
**Total Records Analyzed**: ${allParks.length}

---

## Executive Summary

1. **Applications with Multiple Branches**: **${multiBranchApps.length} applications** have more than 1 branch attached (ranging from 2 to 7 branches each, accounting for **39 branch locations** in total).
2. **Mass Transit Entities**:
   - **Strict "Mass Transit" Named Applications**: **${strictMassTransits.length} applications**.
     - **${strictMassTransits.filter(p => p.branches && p.branches.length > 1).length}** have multiple registered branches (*Ekwulobia Urban Mass Transit*, *Peace Mass Transit*, *Goodness & Mercy Mass Transit*, *In God We Trust Mass Transit*, *Cojans Mass Transit*).
     - **${strictMassTransits.filter(p => p.branches && p.branches.length === 1).length}** have a single registered branch.
3. **Single-Branch Records**: 248 applications have exactly 1 branch entry in the \`branches\` array (which mirrors their primary site/headquarters).
4. **Duplicates / Triplicates**: Note that *ABC Transport Main Terminal* appears as 3 separate duplicate application records (IDs 171, 161, and 153), each carrying the same 2 Lagos branches (*Oshodi Branch* and *Yaba Branch*).

---

## 1. All Applications with Multiple Branches (> 1 Branch)

Total: **${multiBranchApps.length} applications**

`;

multiBranchApps.forEach((p, index) => {
  md += `### ${index + 1}. ${p.motorParkName?.trim() || 'Unnamed Park'} (${p.branches.length} Branches)\n\n`;
  md += `- **Application ID**: \`${p.id}\`\n`;
  md += `- **Form Serial Number**: \`${p.formSerialNumber || 'N/A'}\`\n`;
  md += `- **ASIN Number**: \`${p.asinNumber || p.asin || 'N/A'}\`\n`;
  md += `- **Owner / Organization**: **${p.ownerName?.trim() || 'N/A'}**\n`;
  md += `- **Ownership Type**: ${p.ownershipType || 'N/A'}\n`;
  md += `- **Facility Type**: ${p.facilityType || 'N/A'}\n`;
  md += `- **Service Types**: ${(p.serviceTypes || []).join(', ') || 'N/A'}\n`;
  md += `- **Primary Location**: ${p.physicalLocation?.trim() || 'N/A'}, ${p.townCommunity?.trim() || ''} (LGA Code: ${p.lga || 'N/A'})\n`;
  md += `- **Contact**: Phone: \`${p.phoneNumber || 'N/A'}\` | Alt: \`${p.alternatePhoneNumber || 'N/A'}\` | Email: \`${p.emailAddress || 'N/A'}\`\n\n`;
  
  md += `| # | Branch ID | Branch Name | Physical Location | LGA | Town / Community | Operational Status |\n`;
  md += `|---|-----------|-------------|-------------------|-----|------------------|--------------------|\n`;
  p.branches.forEach((b, bIdx) => {
    md += `| ${bIdx + 1} | \`${b.id}\` | ${b.name?.trim() || '-'} | ${b.physicalLocation?.trim() || '-'} | ${b.lga?.trim() || '-'} | ${b.townCommunity?.trim() || '-'} | ${b.operationalStatus || '-'} |\n`;
  });
  md += `\n---\n\n`;
});

md += `## 2. Strict "Mass Transit" Applications Breakdown\n\n`;
md += `Total: **${strictMassTransits.length} applications**\n\n`;
md += `### 2.1 Mass Transits with Multiple Branches (${strictMassTransits.filter(p => p.branches && p.branches.length > 1).length})\n\n`;

strictMassTransits.filter(p => p.branches && p.branches.length > 1).forEach((p, idx) => {
  md += `${idx + 1}. **${p.motorParkName?.trim()}** (ID: \`${p.id}\`) — **${p.branches.length} branches**\n`;
  md += `   - Owner: ${p.ownerName?.trim()}\n`;
  p.branches.forEach((b, bIdx) => {
    md += `   - Branch ${bIdx + 1}: *${b.name?.trim()}* (${b.physicalLocation?.trim() || 'N/A'}, LGA: ${b.lga?.trim() || 'N/A'})\n`;
  });
});

md += `\n### 2.2 Mass Transits with Single Branch (${strictMassTransits.filter(p => p.branches && p.branches.length === 1).length})\n\n`;
md += `| ID | Park Name | Owner Name | Registered Branch Location | LGA |\n`;
md += `|----|-----------|------------|----------------------------|-----|\n`;
strictMassTransits.filter(p => p.branches && p.branches.length === 1).forEach(p => {
  const b = p.branches[0] || {};
  md += `| \`${p.id}\` | ${p.motorParkName?.trim()} | ${p.ownerName?.trim()} | ${b.physicalLocation?.trim() || p.physicalLocation?.trim() || '-'} | ${b.lga?.trim() || p.lga || '-'} |\n`;
});

fs.writeFileSync(
  path.join(__dirname, '../app/api/applications_with_branches.md'),
  md,
  'utf8'
);

console.log('Successfully generated applications_with_branches.json and applications_with_branches.md');
