import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Member, OrgSettings, LedgerEntry } from '../types';
import { money, toBn, formatBnDate, formatMobile, generateLedger, formatMonthBn } from '../utils';

// Wait for images inside a DOM node to finish loading
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises: Promise<void>[] = [];
  images.forEach((img) => {
    if (img.complete) return;
    promises.push(
      new Promise((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      })
    );
  });
  await Promise.all(promises);
}

// Convert HTML element to high-res canvas
async function renderElementToCanvas(element: HTMLElement, scale = 2.5): Promise<HTMLCanvasElement> {
  await waitForImages(element);
  return await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });
}

/**
 * 1. Download Single Member Vertical ID Card (Lanyard Badge size 54x86 mm)
 */
export async function downloadSingleIdCardPdf(
  member: Member,
  element: HTMLElement
): Promise<void> {
  const canvas = await renderElementToCanvas(element, 3.5);
  
  // Standard ID-1 card dimensions in mm (portrait)
  const cardWidth = 54;
  const cardHeight = 86;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [cardWidth, cardHeight]
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');
  
  const cleanName = (member.Name || 'member').replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`${member.MemberNo}_${cleanName}_ID_Badge.pdf`);
}

/**
 * Download ID card as High Resolution Image (PNG)
 */
export async function downloadSingleIdCardImage(
  member: Member,
  element: HTMLElement
): Promise<void> {
  const canvas = await renderElementToCanvas(element, 3.5);
  const link = document.createElement('a');
  link.download = `${member.MemberNo}_${member.Name}_ID_Badge.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 2. Download Master All Members Complete Data Directory (PDF)
 */
export async function exportAllMembersMasterPdf(
  members: Member[],
  settings: OrgSettings
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1120px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '40px 48px';
  container.style.fontFamily = "'Poppins', sans-serif";

  const totalPaid = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
  const totalFine = members.reduce((sum, m) => sum + (m.totalFine || 0), 0);
  const totalDues = members.reduce((sum, m) => sum + (m.dueAmount || 0), 0);
  const dueMembersCount = members.filter((m) => (m.dueAmount || 0) > 0).length;

  const rowsHtml = members.map((m, idx) => {
    const hasDues = (m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0;
    const statusBg = hasDues ? '#fee2e2' : '#dcfce7';
    const statusColor = hasDues ? '#b91c1c' : '#15803d';
    const statusText = hasDues ? `Due: ৳${money((m.dueAmount || 0) + (m.dueFineAmount || 0))}` : 'Regular';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <img src="${m.Photo || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E'}" 
               style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid #cbd5e1; display: inline-block; vertical-align: middle;" 
               crossorigin="anonymous" />
        </td>
        <td style="padding: 10px 8px; font-weight: bold; color: #0d9488;">${m.MemberNo}</td>
        <td style="padding: 10px 8px; font-weight: 600; color: #0f172a;">${m.Name}</td>
        <td style="padding: 10px 8px;">${formatMobile(m.Mobile) || '—'}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: #e11d48;">${m.BloodGroup || '—'}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 600;">৳ ${money(m.InstallmentAmount)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #0f766e;">৳ ${money(m.totalPaid || 0)}</td>
        <td style="padding: 10px 8px; text-align: right; color: #b45309;">${(m.totalFine || 0) > 0 ? '৳ ' + money(m.totalFine) : '—'}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: bold;">
            ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div>
      <!-- Header -->
      <div style="border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${settings.orgSub} • ${settings.address}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">Phone: ${settings.phone} | Email: ${settings.email}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 17px; font-weight: bold; color: #0d9488;">All Members Master Directory & Ledger</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Date: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Members</div>
          <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px;">${members.length} Members</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase;">Total Savings Collected</div>
          <div style="font-size: 20px; font-weight: bold; color: #15803d; margin-top: 4px;">৳ ${money(totalPaid)}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Total Pending Installments</div>
          <div style="font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 4px;">৳ ${money(totalDues)}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase;">Overdue Members</div>
          <div style="font-size: 20px; font-weight: bold; color: #d97706; margin-top: 4px;">${dueMembersCount} Members</div>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #0d9488; color: #ffffff; font-size: 12.5px; text-align: left; text-transform: uppercase;">
            <th style="padding: 10px 8px; text-align: center; border-radius: 8px 0 0 0;">#</th>
            <th style="padding: 10px 8px; text-align: center;">Photo</th>
            <th style="padding: 10px 8px;">Member ID</th>
            <th style="padding: 10px 8px;">Full Name</th>
            <th style="padding: 10px 8px;">Mobile</th>
            <th style="padding: 10px 8px; text-align: center;">Blood</th>
            <th style="padding: 10px 8px; text-align: right;">Installment</th>
            <th style="padding: 10px 8px; text-align: right;">Total Paid</th>
            <th style="padding: 10px 8px; text-align: right;">Fine Paid</th>
            <th style="padding: 10px 8px; text-align: center; border-radius: 0 8px 0 0;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Footer & Signature -->
      <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 12px; color: #94a3b8;">
          System Generated Report • ${settings.orgName} Digital Savings Portal
        </div>
        <div style="text-align: center;">
          <div style="width: 180px; border-top: 1.5px dashed #64748b; margin-bottom: 6px;"></div>
          <div style="font-size: 12px; font-weight: bold; color: #334155;">Authorized Signature / Chairman</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await renderElementToCanvas(container, 2.2);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const cleanTitle = (settings.orgName || 'All_Members').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`${cleanTitle}_All_Members_Directory.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 3. Download Member Individual Statement PDF
 */
export async function downloadMemberStatementPdf(
  member: Member,
  settings: OrgSettings
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '840px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '40px 45px';
  container.style.fontFamily = "'Poppins', sans-serif";

  const payments = member.payments || [];
  const ledger = generateLedger(member, payments);

  const rows = ledger.map((entry) => {
    let amtHtml = '';
    if (entry.paid > 0 && entry.dueAmt === 0) {
      amtHtml = `৳ ${money(entry.paid)}`;
    } else if (entry.paid > 0 && entry.dueAmt > 0) {
      amtHtml = `৳ ${money(entry.paid)}<br><span style="color:#b91c1c; font-size:11px; font-weight:600;">Due: ৳${money(entry.dueAmt)}</span>`;
    } else {
      amtHtml = `<span style="color:#b91c1c; font-weight:600;">Due: ৳${money(entry.dueAmt)}</span>`;
    }

    let fineHtml = '—';
    if (entry.finePaid > 0 && entry.dueFine === 0) {
      fineHtml = `৳ ${money(entry.finePaid)}`;
    } else if (entry.finePaid > 0 && entry.dueFine > 0) {
      fineHtml = `৳ ${money(entry.finePaid)}<br><span style="color:#b91c1c; font-size:11px; font-weight:600;">Due: ৳${money(entry.dueFine)}</span>`;
    } else if (entry.dueFine > 0) {
      fineHtml = `<span style="color:#b91c1c; font-weight:600;">Due: ৳${money(entry.dueFine)}</span>`;
    }

    const note = entry.paid === 0 
      ? '<span style="color:#b91c1c; font-weight:500;">Unpaid</span>'
      : (entry.notes.join(', ') || '<span style="color:#0f766e; font-weight:500;">Paid</span>');

    const dateStr = entry.dates.length > 0 ? entry.dates.map((d) => formatBnDate(d)).join('<br>') : '—';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 12px; font-weight: 600;">${entry.monthName}</td>
        <td style="padding: 10px 12px;">${dateStr}</td>
        <td style="padding: 10px 12px;">${amtHtml}</td>
        <td style="padding: 10px 12px;">${fineHtml}</td>
        <td style="padding: 10px 12px;">${note}</td>
      </tr>
    `;
  }).join('');

  const totalPaid = payments.reduce((s, p) => s + Number(p.Amount || 0), 0);
  const totalFine = payments.reduce((s, p) => s + Number(p.Fine || 0), 0);

  container.innerHTML = `
    <div>
      <div style="border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${settings.orgSub}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: bold; color: #0d9488;">Member Savings Statement</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Date: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px; font-size: 13px;">
        <div><strong style="color: #64748b;">Member Name:</strong> <span style="font-weight: bold; color: #0f172a;">${member.Name}</span></div>
        <div><strong style="color: #64748b;">Member ID:</strong> <span style="font-weight: bold; color: #0d9488;">${member.MemberNo}</span></div>
        <div><strong style="color: #64748b;">Phone:</strong> <span>${formatMobile(member.Mobile) || '—'}</span></div>
        <div><strong style="color: #64748b;">Monthly Rate:</strong> <span style="font-weight: bold;">৳ ${money(member.InstallmentAmount)}</span></div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155; font-size: 12.5px; text-align: left; border-bottom: 2px solid #cbd5e1; text-transform: uppercase;">
            <th style="padding: 10px 12px;">Month</th>
            <th style="padding: 10px 12px;">Payment Date</th>
            <th style="padding: 10px 12px;">Installment Paid</th>
            <th style="padding: 10px 12px;">Fine Paid</th>
            <th style="padding: 10px 12px;">Notes / Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-left: auto; width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 13.5px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="color: #64748b;">Total Savings:</span>
          <span style="font-weight: bold;">৳ ${money(totalPaid)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="color: #64748b;">Total Fine:</span>
          <span style="font-weight: bold;">৳ ${money(totalFine)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1.5px solid #cbd5e1; margin-top: 6px; font-size: 15px; font-weight: bold; color: #0d9488;">
          <span>Grand Total:</span>
          <span>৳ ${money(totalPaid + totalFine)}</span>
        </div>
      </div>

      <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        ${settings.orgName} — Automated Digital Statement
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await renderElementToCanvas(container, 2.2);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const cleanName = (member.Name || 'member').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`${member.MemberNo}_${cleanName}_Statement.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 4. Download Monthly Collection and Due Report PDF
 */
export async function downloadMonthlyReportPdf(
  members: Member[],
  monthYm: string,
  settings: OrgSettings
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '40px 45px';
  container.style.fontFamily = "'Poppins', sans-serif";

  const monthBn = formatMonthBn(monthYm);
  let totalColl = 0;
  let totalFineColl = 0;
  let totalDue = 0;
  let totalDueFine = 0;

  const rows = members.map((m) => {
    const ledger = generateLedger(m, m.payments || []);
    const entry = ledger.find((l) => l.ym === monthYm);

    const paid = entry ? entry.paid : 0;
    const finePaid = entry ? entry.finePaid : 0;
    const dueAmt = entry ? entry.dueAmt : 0;
    const dueFine = entry ? entry.dueFine : 0;

    totalColl += paid;
    totalFineColl += finePaid;
    totalDue += dueAmt;
    totalDueFine += dueFine;

    const amtStr = paid > 0 ? `৳ ${money(paid)}` : '—';
    let fineStr = '—';
    if (finePaid > 0 && dueFine === 0) fineStr = `৳ ${money(finePaid)}`;
    else if (finePaid > 0 && dueFine > 0) fineStr = `Paid ৳${money(finePaid)}<br><span style="color:#dc2626; font-weight:bold;">Due ৳${money(dueFine)}</span>`;
    else if (dueFine > 0) fineStr = `<span style="color:#dc2626; font-weight:bold;">Due ৳${money(dueFine)}</span>`;

    const dueStr = dueAmt > 0 ? `<span style="color:#dc2626; font-weight:bold;">৳ ${money(dueAmt)}</span>` : '—';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 8px; font-weight: 600; color: #0d9488;">${m.MemberNo}</td>
        <td style="padding: 10px 8px; font-weight: 600;">${m.Name}</td>
        <td style="padding: 10px 8px;">${formatMobile(m.Mobile) || '—'}</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #0f766e;">${amtStr}</td>
        <td style="padding: 10px 8px;">${fineStr}</td>
        <td style="padding: 10px 8px;">${dueStr}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div>
      <div style="border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${settings.orgSub}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 17px; font-weight: bold; color: #0d9488;">Monthly Statement Report — ${monthBn}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Date: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Members</div>
          <div style="font-size: 19px; font-weight: bold; color: #0f172a; margin-top: 4px;">${members.length} Members</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase;">Collections (${monthBn})</div>
          <div style="font-size: 19px; font-weight: bold; color: #15803d; margin-top: 4px;">৳ ${money(totalColl)}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase;">Fines Collected</div>
          <div style="font-size: 19px; font-weight: bold; color: #d97706; margin-top: 4px;">৳ ${money(totalFineColl)}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Overdue Installments</div>
          <div style="font-size: 19px; font-weight: bold; color: #dc2626; margin-top: 4px;">৳ ${money(totalDue)}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #0d9488; color: #ffffff; font-size: 12.5px; text-align: left; text-transform: uppercase;">
            <th style="padding: 10px 8px; border-radius: 8px 0 0 0;">Member ID</th>
            <th style="padding: 10px 8px;">Full Name</th>
            <th style="padding: 10px 8px;">Mobile</th>
            <th style="padding: 10px 8px;">Collected (${monthBn})</th>
            <th style="padding: 10px 8px;">Fine</th>
            <th style="padding: 10px 8px; border-radius: 0 8px 0 0;">Overdue</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        ${settings.orgName} — Automated Monthly Statement Report
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await renderElementToCanvas(container, 2.2);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(`Monthly_Report_${monthYm}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
