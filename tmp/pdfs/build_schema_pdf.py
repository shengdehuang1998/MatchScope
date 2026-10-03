from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/match-insight-table-model.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('STSong-Light', 'C:/Windows/Fonts/simsun.ttc', subfontIndex=0))
c = canvas.Canvas(str(OUT), pagesize=landscape(A3))
W,H=landscape(A3)
c.setTitle('Match Insight - 数据表模型图')
def txt(x,y,s,size=11,color='#24344B',font='STSong-Light'):
    c.setFillColor(HexColor(color)); c.setFont(font,size); c.drawString(x,y,s)
txt(40,H-48,'Match Insight | 数据表模型图',25)
txt(40,H-72,'7 张表 · PostgreSQL · 主要字段与数据库外键关系',12)

def edge(points,label,lx,ly,dashed=False):
    c.setStrokeColor(HexColor('#64758A'));c.setLineWidth(1.2)
    c.setDash(5,3) if dashed else c.setDash()
    p=c.beginPath();p.moveTo(*points[0])
    for q in points[1:]:p.lineTo(*q)
    c.drawPath(p);c.setDash()
    x,y=points[-1];px,py=points[-2]
    import math
    a=math.atan2(y-py,x-px)
    for d in [-0.45,0.45]:c.line(x,y,x-7*math.cos(a+d),y-7*math.sin(a+d))
    txt(lx,ly,label,10)

def box(x,y,name,title,fields):
    w,h=290,176
    c.setFillColor(HexColor('#F8FAFC'));c.setStrokeColor(HexColor('#C5D0DE'))
    c.roundRect(x,y,w,h,7,fill=1,stroke=1)
    c.setFillColor(HexColor('#E7EFF8'));c.rect(x+1,y+h-43,w-2,42,fill=1,stroke=0)
    txt(x+12,y+h-20,name,14,font='Helvetica-Bold')
    txt(x+12,y+h-36,title,10)
    for i,f in enumerate(fields):txt(x+12,y+h-61-i*15,f,10,font='Helvetica')

# Arrow direction: referenced parent -> referencing child.
edge([(330,634),(440,634)],'1 : N 拥有模板',344,645)
edge([(185,546),(185,468)],'1 : 0..1 设置',197,505)
edge([(40,600),(25,600),(25,250),(75,250),(75,230)],'1 : N 会话',85,266)
edge([(185,722),(185,748),(980,748),(980,722)],'0..1 : N 操作者',755,756)
edge([(585,546),(585,468)],'1 : N 历史版本',596,505)
edge([(660,468),(660,546)],'0..1 : 0..1 当前版本',674,509,True)
edge([(730,379),(835,379)],'1 : N 绑定',747,390)
edge([(330,590),(393,590),(393,255),(980,255),(980,292)],'1 : N 用户拥有比赛',770,265)
edge([(330,615),(370,615),(370,420),(440,420)],'1 : N 创建版本',375,431)

box(40,546,'users','用户',['id  UUID  PK','email  TEXT  (case-insensitive unique)','password_hash  TEXT','display_name  TEXT','is_active  BOOLEAN'])
box(40,292,'user_settings','通知与分析默认设置',['user_id  UUID  PK / FK','recipient_email  TEXT','default_timezone  TEXT','default_analysis_lead_minutes  INT','email_notifications_enabled  BOOLEAN'])
box(40,54,'sessions','登录会话与刷新令牌',['id  UUID  PK','user_id  UUID  FK','refresh_token_hash  TEXT  UNIQUE','expires_at / revoked_at  TIMESTAMPTZ','replaced_by_session_id  UUID  FK'])
box(440,546,'prompt_templates','分析模板',['id  UUID  PK','user_id  UUID  FK','name / description  TEXT','is_default  BOOLEAN','current_version_id  UUID  FK','archived_at  TIMESTAMPTZ'])
box(440,292,'prompt_versions','不可变模板历史版本',['id  UUID  PK','user_id + template_id  UUID  FK','created_by_user_id  UUID  FK','version_number  INT','content  TEXT','UNIQUE (template_id, version_number)'])
box(835,546,'audit_logs','操作审计日志',['id  BIGINT  PK','actor_user_id  UUID  FK (nullable)','action / resource_type  TEXT','resource_id  UUID (no FK)','request_id  TEXT / metadata  JSONB'])
box(835,292,'matches','比赛与排期',['id  UUID  PK / user_id  UUID  FK','user_id + prompt_version_id  UUID  FK','league / home_team / away_team  TEXT','kickoff_at  TIMESTAMPTZ','status  TEXT / schedule_version  INT','deleted_at  TIMESTAMPTZ'])

txt(440,216,'关系说明',14)
for i,s in enumerate([
    '箭头由被引用表指向持有外键的表；1 : N 表示子记录可为零条或多条。',
    '虚线表示模板的可选当前版本引用；该版本必须属于当前模板。',
    'sessions.replaced_by_session_id 自关联：旧会话可引用一个替代会话。',
    '版本归属通过模板联合外键约束；比赛联合外键确保引用同一用户的版本。',
    '每个用户最多一个未归档默认模板；删除用户后审计日志保留，操作者置空。',
    '比赛状态：draft / scheduled / cancelled / finished。通用时间字段部分省略。',
]): txt(440,192-i*20,s,11)
txt(40,30,'依据：database/migrations/0001_initial_schema.sql；与 Drizzle 模型交叉核对，未连接实际数据库。',10)
txt(W-95,30,'1 / 1',10,font='Helvetica')
c.save()
print(OUT)
