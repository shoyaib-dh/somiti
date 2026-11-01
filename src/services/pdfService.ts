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
  const canvas = await renderElementToCanvas(element, 3);
  
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
  
  const cleanName = (member.Name || 'member').replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_');
  pdf.save(`${member.MemberNo}_${cleanName}_ID_Card.pdf`);
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
  link.download = `${member.MemberNo}_${member.Name}_ID_Card.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 2. Download Master All Members Complete Data Directory (PDF)
 * Fulfills: "সব সদস্যদের ডেটা গুলি আমি পিডিএফ আকারে সেভ করতে পারি সেই অপশন রাখো"
 */
export async function exportAllMembersMasterPdf(
  members: Member[],
  settings: OrgSettings
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1120px'; // Wide A4 portrait layout
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '40px 48px';
  container.style.fontFamily = "'Hind Siliguri', 'Tiro Bangla', sans-serif";

  const totalPaid = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
  const totalFine = members.reduce((sum, m) => sum + (m.totalFine || 0), 0);
  const totalDues = members.reduce((sum, m) => sum + (m.dueAmount || 0), 0);
  const dueMembersCount = members.filter((m) => (m.dueAmount || 0) > 0).length;

  const rowsHtml = members.map((m, idx) => {
    const hasDues = (m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0;
    const statusBg = hasDues ? '#fee2e2' : '#dcfce7';
    const statusColor = hasDues ? '#b91c1c' : '#15803d';
    const statusText = hasDues ? `বকেয়া: ৳${money((m.dueAmount || 0) + (m.dueFineAmount || 0))}` : 'নিয়মিত';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13.5px;">
        <td style="padding: 10px 8px; text-align: center; font-family: 'Poppins', sans-serif;">${toBn(idx + 1)}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <img src="${m.Photo || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E'}" 
               style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid #cbd5e1; display: inline-block; vertical-align: middle;" 
               crossorigin="anonymous" />
        </td>
        <td style="padding: 10px 8px; font-weight: bold; font-family: 'Poppins', sans-serif; color: #0d9488;">${m.MemberNo}</td>
        <td style="padding: 10px 8px; font-weight: 600; color: #0f172a;">${m.Name}</td>
        <td style="padding: 10px 8px; font-family: 'Poppins', sans-serif;">${formatMobile(m.Mobile) || '—'}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: #e11d48;">${m.BloodGroup || '—'}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 600;">৳${money(m.InstallmentAmount)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #0f766e;">৳${money(m.totalPaid || 0)}</td>
        <td style="padding: 10px 8px; text-align: right; color: #b45309;">${(m.totalFine || 0) > 0 ? '৳' + money(m.totalFine) : '—'}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: ${statusBg}; color: ${statusColor}; font-size: 11.5px; font-weight: bold;">
            ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div>
      <!-- Header -->
      <div style="border-bottom: 3px solid #0d9488; padding-bottom: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; font-size: 26px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${settings.orgSub} • ${settings.address}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">যোগাযোগ: ${settings.phone} | ইমেইল: ${settings.email}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #0d9488;">সকল সদস্যদের পূর্ণাঙ্গ তালিকা ও আর্থিক প্রতিবেদন</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">তারিখ: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #64748b;">মোট সদস্য সংখ্যা</div>
          <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-top: 4px;">${toBn(members.length)} জন</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #166534;">মোট উত্তোলিত সঞ্চয়</div>
          <div style="font-size: 22px; font-weight: bold; color: #15803d; margin-top: 4px;">৳${money(totalPaid)}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #991b1b;">মোট বকেয়া কিস্তি</div>
          <div style="font-size: 22px; font-weight: bold; color: #dc2626; margin-top: 4px;">৳${money(totalDues)}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #92400e;">বকেয়া সদস্য সংখ্যা</div>
          <div style="font-size: 22px; font-weight: bold; color: #d97706; margin-top: 4px;">${toBn(dueMembersCount)} জন</div>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #0d9488; color: #ffffff; font-size: 13.5px; text-align: left;">
            <th style="padding: 10px 8px; text-align: center; border-radius: 8px 0 0 0;">ক্রমিক</th>
            <th style="padding: 10px 8px; text-align: center;">ছবি</th>
            <th style="padding: 10px 8px;">সদস্য নং</th>
            <th style="padding: 10px 8px;">নাম</th>
            <th style="padding: 10px 8px;">মোবাইল</th>
            <th style="padding: 10px 8px; text-align: center;">রক্তের গ্রুপ</th>
            <th style="padding: 10px 8px; text-align: right;">মাসিক কিস্তি</th>
            <th style="padding: 10px 8px; text-align: right;">মোট জমা</th>
            <th style="padding: 10px 8px; text-align: right;">জরিমানা জমা</th>
            <th style="padding: 10px 8px; text-align: center; border-radius: 0 8px 0 0;">বর্তমান অবস্থা</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Footer & Signature -->
      <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 12px; color: #94a3b8;">
          স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত • ${settings.orgName} ডিজিটাল সঞ্চয় ব্যবস্থাপনা সিস্টেম
        </div>
        <div style="text-align: center;">
          <div style="width: 180px; border-top: 1.5px dashed #64748b; margin-bottom: 6px;"></div>
          <div style="font-size: 13px; font-weight: bold; color: #334155;">অনুমোদিত স্বাক্ষরকারী / সভাপতি</div>
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

    pdf.save(`${settings.orgName}_সকল_সদস্যের_তালিকা.pdf`);
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
  container.style.fontFamily = "'Hind Siliguri', 'Tiro Bangla', sans-serif";

  const payments = member.payments || [];
  const ledger = generateLedger(member, payments);

  const rows = ledger.map((entry) => {
    let amtHtml = '';
    if (entry.paid > 0 && entry.dueAmt === 0) {
      amtHtml = `৳${money(entry.paid)}`;
    } else if (entry.paid > 0 && entry.dueAmt > 0) {
      amtHtml = `৳${money(entry.paid)}<br><span style="color:#b91c1c; font-size:12px; font-weight:600;">বকেয়া: ৳${money(entry.dueAmt)}</span>`;
    } else {
      amtHtml = `<span style="color:#b91c1c; font-weight:600;">বকেয়া: ৳${money(entry.dueAmt)}</span>`;
    }

    let fineHtml = '—';
    if (entry.finePaid > 0 && entry.dueFine === 0) {
      fineHtml = `৳${money(entry.finePaid)}`;
    } else if (entry.finePaid > 0 && entry.dueFine > 0) {
      fineHtml = `৳${money(entry.finePaid)}<br><span style="color:#b91c1c; font-size:12px; font-weight:600;">বকেয়া: ৳${money(entry.dueFine)}</span>`;
    } else if (entry.dueFine > 0) {
      fineHtml = `<span style="color:#b91c1c; font-weight:600;">বকেয়া: ৳${money(entry.dueFine)}</span>`;
    }

    const note = entry.paid === 0 
      ? '<span style="color:#b91c1c; font-weight:500;">পরিশোধ হয়নি</span>'
      : (entry.notes.join(', ') || '<span style="color:#0f766e; font-weight:500;">পরিশোধিত</span>');

    const dateStr = entry.dates.length > 0 ? entry.dates.map((d) => formatBnDate(d)).join('<br>') : '—';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13.5px;">
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
          <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${settings.orgSub}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 17px; font-weight: bold; color: #0d9488;">সদস্য সঞ্চয় স্টেটমেন্ট</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">তারিখ: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px; font-size: 14px;">
        <div><strong style="color: #64748b;">সদস্যের নাম:</strong> <span style="font-weight: bold; color: #0f172a;">${member.Name}</span></div>
        <div><strong style="color: #64748b;">সদস্য নং:</strong> <span style="font-weight: bold; font-family: 'Poppins', sans-serif; color: #0d9488;">${member.MemberNo}</span></div>
        <div><strong style="color: #64748b;">মোবাইল:</strong> <span style="font-family: 'Poppins', sans-serif;">${formatMobile(member.Mobile) || '—'}</span></div>
        <div><strong style="color: #64748b;">মাসিক কিস্তির হার:</strong> <span style="font-weight: bold;">৳${money(member.InstallmentAmount)}</span></div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155; font-size: 13.5px; text-align: left; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 12px;">কিস্তির মাস</th>
            <th style="padding: 10px 12px;">জমার তারিখ</th>
            <th style="padding: 10px 12px;">জমা</th>
            <th style="padding: 10px 12px;">জরিমানা</th>
            <th style="padding: 10px 12px;">মন্তব্য</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-left: auto; width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 14px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="color: #64748b;">মোট জমা কিস্তি:</span>
          <span style="font-weight: bold;">৳${money(totalPaid)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="color: #64748b;">মোট জরিমানা জমা:</span>
          <span style="font-weight: bold;">৳${money(totalFine)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1.5px solid #cbd5e1; margin-top: 6px; font-size: 16px; font-weight: bold; color: #0d9488;">
          <span>সর্বমোট পরিশোধ:</span>
          <span>৳${money(totalPaid + totalFine)}</span>
        </div>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        ${settings.orgName} — স্বয়ংক্রিয় ডিজিটাল স্টেটমেন্ট
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

    pdf.save(`${member.MemberNo}_${member.Name}_Statement.pdf`);
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
  container.style.fontFamily = "'Hind Siliguri', 'Tiro Bangla', sans-serif";

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

    const amtStr = paid > 0 ? `৳${money(paid)}` : '—';
    let fineStr = '—';
    if (finePaid > 0 && dueFine === 0) fineStr = `৳${money(finePaid)}`;
    else if (finePaid > 0 && dueFine > 0) fineStr = `জমা ৳${money(finePaid)}<br><span style="color:#dc2626; font-weight:bold;">বকেয়া ৳${money(dueFine)}</span>`;
    else if (dueFine > 0) fineStr = `<span style="color:#dc2626; font-weight:bold;">বকেয়া ৳${money(dueFine)}</span>`;

    const dueStr = dueAmt > 0 ? `<span style="color:#dc2626; font-weight:bold;">৳${money(dueAmt)}</span>` : '—';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13.5px;">
        <td style="padding: 10px 8px; font-family: 'Poppins', sans-serif; font-weight: 600; color: #0d9488;">${m.MemberNo}</td>
        <td style="padding: 10px 8px; font-weight: 600;">${m.Name}</td>
        <td style="padding: 10px 8px; font-family: 'Poppins', sans-serif;">${formatMobile(m.Mobile) || '—'}</td>
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
          <h1 style="margin: 0; font-size: 25px; color: #0f172a; font-weight: bold;">${settings.orgName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${settings.orgSub}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #0d9488;">মাসিক সঞ্চয় প্রতিবেদন — ${monthBn}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">তারিখ: ${formatBnDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #64748b;">মোট সদস্য</div>
          <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px;">${toBn(members.length)} জন</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #166534;">এই মাসে মোট জমা</div>
          <div style="font-size: 20px; font-weight: bold; color: #15803d; margin-top: 4px;">৳${money(totalColl)}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #92400e;">মোট জরিমানা জমা</div>
          <div style="font-size: 20px; font-weight: bold; color: #d97706; margin-top: 4px;">৳${money(totalFineColl)}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px;">
          <div style="font-size: 12px; color: #991b1b;">এই মাসে বকেয়া কিস্তি</div>
          <div style="font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 4px;">৳${money(totalDue)}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #0d9488; color: #ffffff; font-size: 13.5px; text-align: left;">
            <th style="padding: 10px 8px; border-radius: 8px 0 0 0;">সদস্য নং</th>
            <th style="padding: 10px 8px;">নাম</th>
            <th style="padding: 10px 8px;">মোবাইল</th>
            <th style="padding: 10px 8px;">জমা (${monthBn})</th>
            <th style="padding: 10px 8px;">জরিমানা</th>
            <th style="padding: 10px 8px; border-radius: 0 8px 0 0;">বকেয়া</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        ${settings.orgName} — স্বয়ংক্রিয় মাসিক হিসাব প্রতিবেদন
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

    pdf.save(`মাসিক_প্রতিবেদন_${monthYm}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
