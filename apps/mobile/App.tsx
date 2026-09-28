import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

type Tab = 'matches' | 'records' | 'settings';
type MatchStatus = '等待分析' | '分析已发布';
type Match = { id: string; league: string; home: string; away: string; kickoff: string; analysisAt: string; status: MatchStatus };

const matches: Match[] = [
  { id: 'ars-che', league: '英超', home: '阿森纳', away: '切尔西', kickoff: '今天 20:00', analysisAt: '19:00 发布赛前分析', status: '等待分析' },
  { id: 'bar-atm', league: '西甲', home: '巴塞罗那', away: '马德里竞技', kickoff: '今天 22:00', analysisAt: '分析报告已发布', status: '分析已发布' },
  { id: 'bay-b04', league: '德甲', home: '拜仁慕尼黑', away: '勒沃库森', kickoff: '明天 02:30', analysisAt: '01:30 发布赛前分析', status: '等待分析' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('matches');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const published = useMemo(() => matches.filter((item) => item.status === '分析已发布'), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {tab === 'matches' && <MatchesScreen items={matches} />}
        {tab === 'records' && <RecordsScreen items={published} />}
        {tab === 'settings' && <SettingsScreen emailEnabled={emailEnabled} pushEnabled={pushEnabled} onEmailChange={setEmailEnabled} onPushChange={setPushEnabled} />}
        <BottomTabs value={tab} onChange={setTab} />
      </View>
    </SafeAreaView>
  );
}

function MatchesScreen({ items }: { items: Match[] }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}><View><Text style={styles.eyebrow}>9月28日 星期一</Text><Text style={styles.title}>比赛</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>W</Text></View></View>
      <Pressable style={styles.featuredCard}>
        <Text style={styles.featuredLabel}>下一场比赛</Text><Text style={styles.featuredTeams}>阿森纳  vs  切尔西</Text><Text style={styles.featuredMeta}>英超 · 今天 20:00</Text>
        <View style={styles.featuredFooter}><View><Text style={styles.featuredLabel}>赛前分析</Text><Text style={styles.featuredTime}>19:00 发布</Text></View><Text style={styles.chevronLight}>›</Text></View>
      </Pressable>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>近期比赛</Text><Text style={styles.sectionHint}>共 {items.length} 场</Text></View>
      {items.map((item) => <MatchCard key={item.id} item={item} />)}
    </ScrollView>
  );
}

function MatchCard({ item }: { item: Match }) {
  const published = item.status === '分析已发布';
  return (
    <Pressable style={styles.card}>
      <View style={styles.leagueBadge}><Text style={styles.leagueText}>{item.league}</Text></View>
      <View style={styles.cardBody}><Text style={styles.cardTitle}>{item.home} vs {item.away}</Text><Text style={styles.cardMeta}>{item.kickoff}</Text><Text style={styles.cardMeta}>{item.analysisAt}</Text></View>
      <View style={[styles.statusBadge, published ? styles.statusPublished : styles.statusWaiting]}><Text style={[styles.statusText, published ? styles.statusPublishedText : styles.statusWaitingText]}>{item.status}</Text></View>
    </Pressable>
  );
}

function RecordsScreen({ items }: { items: Match[] }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>已经发布的分析</Text><Text style={styles.title}>记录</Text>
      <View style={styles.segment}><Text style={styles.segmentActive}>全部</Text><Text style={styles.segmentItem}>本周</Text><Text style={styles.segmentItem}>本月</Text></View>
      <Text style={styles.dateLabel}>今天</Text>
      {items.map((item) => <Pressable style={styles.recordCard} key={item.id}><View style={styles.recordTop}><Text style={styles.recordLeague}>{item.league}</Text><Text style={styles.recordTime}>{item.kickoff}</Text></View><Text style={styles.recordTeams}>{item.home} vs {item.away}</Text><Text style={styles.recordSummary}>主队近期状态更稳定，报告置信度中等</Text><Text style={styles.openReport}>查看完整报告  ›</Text></Pressable>)}
    </ScrollView>
  );
}

function SettingsScreen(props: { emailEnabled: boolean; pushEnabled: boolean; onEmailChange: (value: boolean) => void; onPushChange: (value: boolean) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>个人偏好与通知</Text><Text style={styles.title}>设置</Text>
      <Text style={styles.groupLabel}>账户</Text><View style={styles.settingsGroup}><SettingRow label="接收邮箱" value="user@example.com" /><SettingRow label="时区" value="北京时间" last /></View>
      <Text style={styles.groupLabel}>通知</Text><View style={styles.settingsGroup}><ToggleRow label="邮件通知" value={props.emailEnabled} onChange={props.onEmailChange} /><ToggleRow label="App 推送" value={props.pushEnabled} onChange={props.onPushChange} last /></View>
      <Text style={styles.groupLabel}>其他</Text><View style={styles.settingsGroup}><SettingRow label="隐私说明" value="›" /><SettingRow label="退出登录" value="" last danger /></View>
      <Text style={styles.version}>MatchScope 0.1.0</Text>
    </ScrollView>
  );
}

function SettingRow({ label, value, last, danger }: { label: string; value: string; last?: boolean; danger?: boolean }) {
  return <Pressable style={[styles.settingRow, last && styles.lastRow]}><Text style={[styles.settingLabel, danger && styles.danger]}>{label}</Text><Text style={styles.settingValue}>{value}</Text></Pressable>;
}

function ToggleRow({ label, value, onChange, last }: { label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return <View style={[styles.settingRow, last && styles.lastRow]}><Text style={styles.settingLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: '#D7DBE0', true: '#2674FF' }} /></View>;
}

function BottomTabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [{ id: 'matches', label: '比赛', icon: '◉' }, { id: 'records', label: '记录', icon: '◷' }, { id: 'settings', label: '设置', icon: '⚙' }];
  return <View style={styles.tabs}>{tabs.map((item) => { const active = value === item.id; return <Pressable key={item.id} style={styles.tab} onPress={() => onChange(item.id)}><Text style={[styles.tabIcon, active && styles.tabActive]}>{item.icon}</Text><Text style={[styles.tabLabel, active && styles.tabActive]}>{item.label}</Text></Pressable>; })}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F5F7' }, app: { flex: 1, backgroundColor: '#F3F5F7' }, content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 110 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, eyebrow: { color: '#747B86', fontSize: 13, marginBottom: 4 }, title: { color: '#101318', fontSize: 32, lineHeight: 38, fontWeight: '700', marginBottom: 20 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#2674FF', fontSize: 15, fontWeight: '700' },
  featuredCard: { backgroundColor: '#2674FF', borderRadius: 22, padding: 20, marginBottom: 24 }, featuredLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 8 }, featuredTeams: { color: '#FFFFFF', fontSize: 21, fontWeight: '700' }, featuredMeta: { color: 'rgba(255,255,255,0.84)', fontSize: 14, marginTop: 7 }, featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 26 }, featuredTime: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' }, chevronLight: { color: '#FFFFFF', fontSize: 30, lineHeight: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, sectionTitle: { color: '#101318', fontSize: 19, fontWeight: '700' }, sectionHint: { color: '#858C96', fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, marginBottom: 11, flexDirection: 'row', alignItems: 'center' }, leagueBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E9F1FF', alignItems: 'center', justifyContent: 'center' }, leagueText: { color: '#2674FF', fontSize: 12, fontWeight: '700' }, cardBody: { flex: 1, paddingHorizontal: 12 }, cardTitle: { color: '#171A1F', fontSize: 15, fontWeight: '700', marginBottom: 5 }, cardMeta: { color: '#7A818B', fontSize: 12, lineHeight: 18 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, statusWaiting: { backgroundColor: '#FFF4DF' }, statusPublished: { backgroundColor: '#E5F7EC' }, statusText: { fontSize: 11, fontWeight: '700' }, statusWaitingText: { color: '#9A6100' }, statusPublishedText: { color: '#137A46' },
  segment: { flexDirection: 'row', backgroundColor: '#E6E9ED', borderRadius: 12, padding: 3, marginBottom: 24 }, segmentActive: { flex: 1, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 9, paddingVertical: 8, color: '#171A1F', fontWeight: '700' }, segmentItem: { flex: 1, textAlign: 'center', paddingVertical: 8, color: '#747B86' }, dateLabel: { color: '#747B86', fontSize: 13, marginBottom: 8 },
  recordCard: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 17, marginBottom: 12 }, recordTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }, recordLeague: { color: '#2674FF', fontSize: 12, fontWeight: '700' }, recordTime: { color: '#858C96', fontSize: 12 }, recordTeams: { color: '#171A1F', fontSize: 17, fontWeight: '700', marginBottom: 8 }, recordSummary: { color: '#69717D', fontSize: 13, lineHeight: 20 }, openReport: { color: '#2674FF', fontSize: 13, fontWeight: '700', marginTop: 14 },
  groupLabel: { color: '#747B86', fontSize: 13, marginTop: 4, marginBottom: 8, marginLeft: 4 }, settingsGroup: { backgroundColor: '#FFFFFF', borderRadius: 17, paddingHorizontal: 15, marginBottom: 22 }, settingRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE1E6' }, lastRow: { borderBottomWidth: 0 }, settingLabel: { color: '#171A1F', fontSize: 15 }, settingValue: { color: '#858C96', fontSize: 14 }, danger: { color: '#D33A3A' }, version: { textAlign: 'center', color: '#989EA7', fontSize: 12, marginTop: 6 },
  tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D9DDE2', flexDirection: 'row', paddingTop: 8 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' }, tabIcon: { color: '#9198A2', fontSize: 20, height: 25 }, tabLabel: { color: '#9198A2', fontSize: 11, marginTop: 2 }, tabActive: { color: '#2674FF', fontWeight: '700' },
});
