import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span>M</span>
          <strong>MatchScope</strong>
        </div>
        <nav>
          <button className="active">开发状态</button>
          <button>比赛管理</button>
          <button>分析模板</button>
          <button>系统设置</button>
        </nav>
        <div className="account">
          <div className="avatar">M</div>
          <div>
            <strong>MatchScope</strong>
            <small>第一阶段</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p>第一阶段非核心界面</p>
            <h1>管理后台暂未启用</h1>
          </div>
        </header>
        <section className="panel">
          <div className="panelHead">
            <div>
              <h2>请使用 iPhone App</h2>
              <p>比赛、分析模板和设置均通过真实 API 管理。本页面不展示伪造数据。</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
