import { createContext, useContext, useState, useCallback } from 'react';

const ApiContext = createContext(null);

/* 외부 서비스 목록 */
const INITIAL_SERVICES = [
  {
    id: 'slack',
    name: 'Slack',
    icon: 'fa-brands fa-slack',
    iconBg: '#4A154B',
    iconColor: 'white',
    desc: '팀 메시지를 NEXUS 알림과 연동하여 실시간 채널 알림을 받아보세요.',
    connected: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'fa-brands fa-github',
    iconBg: '#24292e',
    iconColor: 'white',
    desc: 'PR, 이슈, 커밋 현황을 칸반보드와 연동합니다.',
    connected: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: 'fa-solid fa-n',
    iconBg: '#000',
    iconColor: 'white',
    desc: 'Notion 데이터베이스와 사내 위키를 동기화합니다.',
    connected: false,
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: 'fa-brands fa-jira',
    iconBg: '#0052CC',
    iconColor: 'white',
    desc: 'Jira 티켓을 NEXUS 칸반보드로 자동 가져옵니다.',
    connected: false,
  },
  {
    id: 'google',
    name: 'Google Workspace',
    icon: 'fa-brands fa-google',
    iconBg: '#4285F4',
    iconColor: 'white',
    desc: 'Google 드라이브, 캘린더와 연동하여 파일을 공유합니다.',
    connected: true,
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: 'fa-brands fa-figma',
    iconBg: '#F24E1E',
    iconColor: 'white',
    desc: '디자인 파일을 바로 문서에 첨부하고 공유하세요.',
    connected: false,
  },
  {
    id: 'aws',
    name: 'AWS CloudWatch',
    icon: 'fa-brands fa-aws',
    iconBg: '#FF9900',
    iconColor: 'white',
    desc: '서버 모니터링 알람을 NEXUS 알림으로 수신합니다.',
    connected: false,
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: 'fa-solid fa-video',
    iconBg: '#2D8CFF',
    iconColor: 'white',
    desc: '화상회의 링크를 NEXUS 캘린더와 자동 연동합니다.',
    connected: false,
  },
];

export function ApiProvider({ children }) {
  const [services, setServices] = useState(INITIAL_SERVICES);

  /* 연동 토글 */
  const toggleConnection = useCallback((id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, connected: !s.connected } : s))
    );
  }, []);

  /* 연결된 서비스 개수 */
  const connectedCount = services.filter((s) => s.connected).length;

  return (
    <ApiContext.Provider value={{ services, toggleConnection, connectedCount }}>
      {children}
    </ApiContext.Provider>
  );
}

export const useApi = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
};