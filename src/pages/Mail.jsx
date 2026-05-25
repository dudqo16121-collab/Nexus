// pages/Mail.jsx
// 메일함 페이지 — 3-패널 (사이드바 / 목록 / 본문) + 작성 모달.

import MailSidebar from '../components/mail/MailSidebar';
import MailList from '../components/mail/MailList';
import MailDetail from '../components/mail/MailDetail';
import MailComposeModal from '../components/mail/MailComposeModal';

export default function Mail() {
  return (
    <section id="view-mail">
      <div className="mail-layout">
        <MailSidebar />
        <MailList />
        <MailDetail />
      </div>
      <MailComposeModal />
    </section>
  );
}