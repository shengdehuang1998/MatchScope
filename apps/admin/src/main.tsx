import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, Card, ConfigProvider, Layout, Menu, Result, Tag, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'antd/dist/reset.css';
import './styles.css';

dayjs.locale('zh-cn');

function App() {
  return (
    <Layout className="shell">
      <Layout.Sider width={236} breakpoint="lg" collapsedWidth={0}>
        <div className="brand">
          <span>M</span>
          <strong>MatchScope</strong>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={['status']}
          items={[
            { key: 'status', label: '开发状态' },
            { key: 'matches', label: '比赛管理', disabled: true },
            { key: 'prompts', label: '分析模板', disabled: true },
            { key: 'settings', label: '系统设置', disabled: true },
          ]}
        />
        <div className="account">
          <Tag color="blue">第一阶段</Tag>
          <span>管理功能待接入</span>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="pageHeader">
          <Typography.Title level={3}>管理后台</Typography.Title>
        </Layout.Header>
        <Layout.Content className="pageContent">
          <Card>
            <Result
              status="info"
              title="管理后台暂未启用"
              subTitle="请使用 iPhone App 处理当前业务。后台业务页面及管理员权限仍待接入。"
            />
          </Card>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2674FF',
          colorError: '#C93434',
          colorBgLayout: '#F3F5F7',
          colorText: '#14171C',
          borderRadius: 12,
          fontFamily: "'Microsoft YaHei', system-ui, sans-serif",
        },
        components: { Layout: { siderBg: '#111A2E' }, Menu: { darkItemBg: '#111A2E' } },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
