import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const matches = [
  { league: '英超', match: '阿森纳 vs 切尔西', kickoff: '今天 20:00', analysis: '19:00', status: '等待分析' },
  { league: '西甲', match: '巴塞罗那 vs 马德里竞技', kickoff: '今天 22:00', analysis: '已完成', status: '待发布' },
  { league: '德甲', match: '拜仁慕尼黑 vs 勒沃库森', kickoff: '明天 02:30', analysis: '01:30', status: '已安排' }
];

function App() {
  return (
    <div className="shell">
      <aside>
        <div className="brand"><span>M</span><strong>MatchScope</strong></div>
        <nav>
          <button className="active">比赛管理</button><button>话术管理</button><button>推送记录</button><button>用户管理</button><button>系统设置</button>
        </nav>
        <div className="account"><div className="avatar">W</div><div><strong>管理员</strong><small>admin@example.com</small></div></div>
      </aside>
      <main>
        <header><div><p>比赛与分析任务</p><h1>比赛管理</h1></div><button className="primary">＋ 新增比赛</button></header>
        <section className="stats">
          <article><span>今日比赛</span><strong>3</strong></article><article><span>等待分析</span><strong>2</strong></article><article><span>待审核</span><strong>1</strong></article><article><span>推送失败</span><strong>0</strong></article>
        </section>
        <section className="panel">
          <div className="panelHead"><div><h2>近期任务</h2><p>管理比赛、分析时间与发布状态</p></div><div className="filters"><button className="selected">全部</button><button>今天</button><button>待处理</button></div></div>
          <table><thead><tr><th>联赛</th><th>比赛</th><th>开赛时间</th><th>分析时间</th><th>状态</th><th></th></tr></thead>
            <tbody>{matches.map((item) => <tr key={item.match}><td><span className="league">{item.league}</span></td><td><strong>{item.match}</strong></td><td>{item.kickoff}</td><td>{item.analysis}</td><td><span className="status">{item.status}</span></td><td><button className="more">•••</button></td></tr>)}</tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
