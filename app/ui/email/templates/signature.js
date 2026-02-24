/**
 * Email signature — appended when API builds HTML from plain text (e.g. internal/admin notifications).
 * Single source for EMAIL_SIGNATURE_HTML and EMAIL_SIGNATURE_TEXT.
 */

export const EMAIL_SIGNATURE_HTML = `
<div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e0e0e0;">
  <div style="text-align: center; font-size: 13px; color: #616161; line-height: 1.8;">
    <div style="margin-bottom: 8px;">
      <strong style="color: #890000; font-size: 14px;">Natali Cars Support</strong>
    </div>
    <div style="color: #757575; margin-bottom: 12px;">
      BBQR Group - Rental Car Services & Restaurant Solutions
    </div>
    <div style="margin-top: 16px;">
      <a href="https://www.bbqr.site" style="color: #008989; text-decoration: none; margin: 0 12px;">
        🌐 www.bbqr.site
      </a>
      <span style="color: #bdbdbd;">|</span>
      <a href="mailto:support@bbqr.site" style="color: #008989; text-decoration: none; margin: 0 12px;">
        ✉️ cars@bbqr.site
      </a>
    </div>
  </div>
</div>`;

export const EMAIL_SIGNATURE_TEXT = `--

Natali Cars Support
BBQR Group - Rental Car Services & Restaurant Solutions

Website: https://www.bbqr.site
Email: cars@bbqr.site`;
