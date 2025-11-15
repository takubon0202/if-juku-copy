import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CSVファイルをパース
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].split(',');
  const values = lines[1].split(',');

  const result = {};
  headers.forEach((header, i) => {
    result[header.trim()] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
  });

  return result;
}

/**
 * characterフォルダのサブフォルダ（キャラクター）をリストアップ
 */
function listCharacters() {
  const characterDir = join(__dirname, '..', 'character');
  if (!existsSync(characterDir)) return [];

  return readdirSync(characterDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

/**
 * imageruleフォルダのCSVファイルをリストアップ
 */
function listImageRules() {
  const imageruleDir = join(__dirname, '..', 'imagerule');
  if (!existsSync(imageruleDir)) return [];

  return readdirSync(imageruleDir)
    .filter(file => file.endsWith('.csv'))
    .map(file => file.replace('.csv', ''));
}

/**
 * キャラクター設定を読み込み
 */
function loadCharacter(characterName) {
  // サブフォルダ内のCSVファイルを探す
  const characterPath = join(__dirname, '..', 'character', characterName, `${characterName}.csv`);
  if (!existsSync(characterPath)) {
    throw new Error(`キャラクター設定が見つかりません: ${characterName}`);
  }

  const content = readFileSync(characterPath, 'utf-8');
  return parseCSV(content);
}

/**
 * 画像一貫性ルールを読み込み
 */
function loadImageRule(ruleName) {
  const rulePath = join(__dirname, '..', 'imagerule', `${ruleName}.csv`);
  if (!existsSync(rulePath)) {
    throw new Error(`一貫性ルールが見つかりません: ${ruleName}`);
  }

  const content = readFileSync(rulePath, 'utf-8');
  return parseCSV(content);
}

/**
 * 全てのキャラクター設定を読み込み
 */
function loadAllCharacters() {
  const characterDir = join(__dirname, '..', 'character');
  if (!existsSync(characterDir)) return [];

  // サブフォルダをリストアップ
  const folders = readdirSync(characterDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const characters = [];

  for (const characterName of folders) {
    try {
      const character = loadCharacter(characterName);
      characters.push(character);
    } catch (error) {
      console.warn(`⚠️  ${characterName}の読み込みをスキップ:`, error.message);
    }
  }

  return characters;
}

/**
 * 全ての画像一貫性ルールを読み込み
 */
function loadAllImageRules() {
  const imageruleDir = join(__dirname, '..', 'imagerule');
  if (!existsSync(imageruleDir)) return [];

  const files = readdirSync(imageruleDir).filter(file => file.endsWith('.csv'));
  const rules = [];

  for (const file of files) {
    const ruleName = file.replace('.csv', '');
    try {
      const rule = loadImageRule(ruleName);
      rules.push(rule);
    } catch (error) {
      console.warn(`⚠️  ${ruleName}の読み込みをスキップ:`, error.message);
    }
  }

  return rules;
}

/**
 * 既存のカレンダーを読み込む
 */
function loadExistingCalendars() {
  const calendarDir = join(__dirname, '..', 'calendar');
  if (!existsSync(calendarDir)) {
    mkdirSync(calendarDir, { recursive: true });
    console.log('📁 calendarフォルダを作成しました');
    return [];
  }

  const files = readdirSync(calendarDir)
    .filter(file => file.startsWith('calendar_') && file.endsWith('.csv'))
    .sort()
    .reverse(); // 最新のファイルを先に

  const existingPosts = [];

  for (const file of files) {
    try {
      const filePath = join(calendarDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      lines.forEach((line, index) => {
        const fields = parseCSVLine(line);
        if (fields.length >= 13) {
          existingPosts.push({
            file: file,
            day: index + 1,
            coverImage: fields[0],
            postText: fields[12]
          });
        }
      });
    } catch (error) {
      console.warn(`⚠️  ${file}の読み込みをスキップ:`, error.message);
    }
  }

  return existingPosts;
}

/**
 * AIで投稿カレンダー（CSV）を生成
 */
async function generateCalendar() {
  try {
    console.log('📅 Instagram投稿カレンダーを生成中...\n');

    // APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEYが設定されていません。.envファイルを確認してください。');
    }

    // 投稿数の設定（環境変数から取得、デフォルトは30日）
    const calendarDays = parseInt(process.env.CALENDAR_DAYS) || 30;
    console.log(`📆 生成する投稿数: ${calendarDays}日分\n`);

    // 既存のカレンダーを読み込む
    const existingPosts = loadExistingCalendars();
    console.log(`📚 既存のカレンダーから${existingPosts.length}件の投稿を読み込みました\n`);

    // 事業情報の読み込み
    const businessSummaryPath = join(__dirname, '..', 'output', 'business-summary.txt');
    if (!existsSync(businessSummaryPath)) {
      throw new Error('business-summary.txtが見つかりません。先にanalyze-homepage.jsを実行してください。');
    }
    const businessSummary = readFileSync(businessSummaryPath, 'utf-8');

    // 全てのキャラクター設定と一貫性ルールの読み込み
    const characters = loadAllCharacters();
    const imageRules = loadAllImageRules();

    console.log('✅ 事業情報を読み込みました');
    console.log(`✅ キャラクター設定を読み込みました（${characters.length}人）`);
    console.log(`✅ 一貫性ルールを読み込みました（${imageRules.length}個）\n`);

    if (characters.length === 0) {
      throw new Error('キャラクター設定が見つかりません。characterフォルダにCSVファイルを配置してください。');
    }

    if (imageRules.length === 0) {
      throw new Error('一貫性ルールが見つかりません。imageruleフォルダにCSVファイルを配置してください。');
    }

    // キャラクター情報を表示
    console.log('👥 読み込んだキャラクター:');
    characters.forEach(char => {
      console.log(`   - ${char.name}`);
    });

    console.log('\n🎨 読み込んだ一貫性ルール:');
    imageRules.forEach(rule => {
      console.log(`   - ${rule.setting_name || rule.name}`);
    });
    console.log();

    // Gemini APIクライアントの初期化
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // キャラクター情報をプロンプト用にフォーマット
    const charactersSection = characters.map((char, idx) => `
## キャラクター${idx + 1}: ${char.name}
- 外見: ${char.appearance}
- 髪: ${char.hair}
- 目: ${char.eyes}
- 顔: ${char.face}
- 体型: ${char.body}
- 服装: ${char.clothing}
- 性格: ${char.personality}
- 追加情報: ${char.additional}
`).join('\n');

    // 画像ルール情報をプロンプト用にフォーマット
    const imageRulesSection = imageRules.map((rule, idx) => `
## 一貫性ルール${idx + 1}: ${rule.setting_name || rule.name}
- 場所・環境: ${rule.location_environment || rule.location}
- キャラクター・人物: ${rule.characters_people || rule.characters}
- 時間帯・照明: ${rule.time_lighting || rule.lighting}
- 雰囲気・スタイル: ${rule.atmosphere_style || rule.style}
- 追加の詳細設定: ${rule.additional_details || rule.additional}
`).join('\n');

    // 既存投稿情報をプロンプト用にフォーマット
    let existingPostsSection = '';
    if (existingPosts.length > 0) {
      const recentPosts = existingPosts.slice(0, 50); // 最新50件を参照

      // 既存投稿のテーマを分析
      const existingThemes = recentPosts.map(post => {
        const text = post.postText.toLowerCase();
        return {
          hasMinecraft: text.includes('マインクラフト') || text.includes('minecraft'),
          hasAI: text.includes('ai') || text.includes('人工知能'),
          hasEntrepreneur: text.includes('起業') || text.includes('ビジネス'),
          hasParent: text.includes('保護者') || text.includes('お母様') || text.includes('親御'),
          hasStudent: text.includes('生徒') || text.includes('子ども'),
          hasInstructor: text.includes('講師') || text.includes('先生') || text.includes('メンター'),
          text: post.postText.substring(0, 200)
        };
      });

      existingPostsSection = `
# 既存の投稿履歴（${recentPosts.length}件）- 重複回避のための重要な参考情報

## 📊 既存投稿の統計
- 総投稿数: ${existingPosts.length}件
- 参照する最新投稿: ${recentPosts.length}件
- 最も古い参照投稿: ${recentPosts[recentPosts.length - 1]?.file || '不明'}
- 最も新しい参照投稿: ${recentPosts[0]?.file || '不明'}

## 🎯 既存投稿のテーマ傾向
- マインクラフト関連: ${existingThemes.filter(t => t.hasMinecraft).length}件
- AI関連: ${existingThemes.filter(t => t.hasAI).length}件
- 起業・ビジネス関連: ${existingThemes.filter(t => t.hasEntrepreneur).length}件
- 保護者向け: ${existingThemes.filter(t => t.hasParent).length}件
- 生徒の成長・事例: ${existingThemes.filter(t => t.hasStudent).length}件
- 講師紹介: ${existingThemes.filter(t => t.hasInstructor).length}件

## 📝 最近の投稿サンプル（最新10件）
${recentPosts.slice(0, 10).map((post, idx) => `
### 既存投稿${idx + 1}（${post.file}）
- 表紙画像の概要: ${post.coverImage.substring(0, 120)}...
- 投稿テキスト: ${post.postText.substring(0, 180)}...
`).join('\n')}

## ⚠️ 重要な制約 - 新規性の確保
**必ず以下を守ってください:**

1. **完全に新しいテーマを選ぶ**
   - 上記の既存投稿と同じテーマ・切り口は避ける
   - 既に使われている具体例や事例は使用しない
   - 同じキャラクターの組み合わせが連続しないようにする

2. **新しい視点を提供**
   - 「〇〇だった子が今では〜」のような同じフォーマットの連続使用を避ける
   - 異なる投稿タイプ（保護者共感型、ストーリー型など）をバランスよく配分
   - 季節感、時事性、新しいトレンドを取り入れる

3. **テーマの多様性を確保**
   - マインクラフトだけでなく、AI、起業、メンター、学習方法など多様なテーマを扱う
   - 保護者向けと生徒向けのバランスを取る
   - Q&A型、日常風景型など、様々な投稿タイプを活用

4. **具体性の変化**
   - 「小6男子」「中1女子」など、既存投稿で使われた具体例と異なる例を使う
   - 新しいエピソード、新しい数字、新しい実績を創造的に提示

**今回生成する投稿は、上記の既存投稿とは明確に異なる、全く新しい内容でなければなりません。**
`;
    }

    // カレンダー生成用プロンプト
    const prompt = `
あなたはInstagramマーケティングの専門家です。以下の情報をもとに、${calendarDays}日分のInstagram投稿カレンダー（カルーセル形式）を作成してください。

# 事業情報
${businessSummary}

${existingPostsSection}

# キャラクター設定（登場人物の一貫性）
以下の${characters.length}人のキャラクターが利用可能です。投稿内容に応じて適切なキャラクターを選んで使用してください。複数人を1つの投稿に登場させることも可能です。
${charactersSection}

# 画像一貫性ルール
以下の${imageRules.length}個の一貫性ルールが利用可能です。投稿内容に応じて適切なルールを選んで使用してください。
${imageRulesSection}

# カルーセル投稿の構成
各日の投稿は4枚の画像で構成されます：
1. 表紙（フックで注目を集める）
2. 内容1（問題提起または共感）
3. 内容2（解決策または価値提示）
4. 内容3（まとめ・CTA）

# CSVフォーマット（13列）
A列: 表紙画像説明（日本語）
B列: 表紙テキストエリア1
C列: 表紙テキストエリア2
D列: 内容1画像説明（日本語）
E列: 内容1テキストエリア1
F列: 内容1テキストエリア2
G列: 内容2画像説明（日本語）
H列: 内容2テキストエリア1
I列: 内容2テキストエリア2
J列: 内容3画像説明（日本語）
K列: 内容3テキストエリア1
L列: 内容3テキストエリア2
M列: 投稿のテキスト+ハッシュタグ

## 画像説明（A,D,G,J列）の作成ルール

### 🚨🚨🚨 最重要制約（絶対厳守） 🚨🚨🚨

**人物登場の絶対ルール:**
1. **登場可能な人物は以下の5人のみ**: 塾長山﨑琢己、CTO井上陽斗、塾頭高崎翔太、学生起業家加賀屋結眞、eスポーツプレイヤー渡辺柚気
2. **これら5人以外の人物は一切登場禁止**: 生徒、保護者、教師、講師、大人、子ども、その他の人物は描写してはいけません
3. **人物を登場させる場合は、必ずフルネームを画像説明に明記**: 例「塾長山﨑琢己が〜」「CTO井上陽斗が〜」
4. **「生徒」「保護者」「人物」などの抽象的な表現は禁止**: これらは架空の人物を生成してしまうため使用不可
5. **人物なしの画像も積極的に使用**: PC画面、教室の雰囲気、マインクラフトの画面など

**違反例（絶対NG）:**
- ❌ 「生徒がPCを操作している」
- ❌ 「保護者が見守っている」
- ❌ 「若い男性が〜」
- ❌ 「中学生が〜」
- ❌ 「講師が教えている」

**正しい例:**
- ✅ 「塾長山﨑琢己がPCを操作している」
- ✅ 「CTO井上陽斗が見守っている」
- ✅ 「マインクラフトの画面が映っている（人物なし）」
- ✅ 「明るい教室の風景（人物なし）」

### その他のルール
- **必ず日本語で記述**
- 人物を登場させる場合は、選んだキャラクターの外見・服装・性格を「キャラクター設定」から正確に描写
- 上記の「画像一貫性ルール」から投稿内容に適したルールを選んで適用
- 場所・照明・スタイルは選んだ一貫性ルールに従う
- 具体的で詳細な描写（AIが画像生成できるレベルの詳細さ）
- 各画像は異なる構図・アングルにする
- ${calendarDays}日分の投稿全体で、全てのキャラクターがバランス良く登場するようにする

## テキストエリア1（B,E,H,K列）のルール
- 1行あたり最大8文字
- 最大2行まで
- 単語の途中では改行しない
- 改行は単語の区切り目で行う
- **改行は「\\n」で表現する**（例: "AIと\\n起業"）
- キャッチーで短いフレーズ

## テキストエリア2（C,F,I,L列）のルール
- 1行あたり最大12文字
- 最大4行まで
- 単語の途中では改行しない
- 改行は単語の区切り目で行う
- **改行は「\\n」で表現する**（例: "プログラミング\\nオンライン塾\\nif(塾)へ\\nようこそ！"）
- より詳細な説明

## 投稿テキスト+ハッシュタグ（M列）のルール

### 投稿文の構造（3段構成）
1. **フック（1〜2文）**: 読者の注意を引く、共感や驚きの要素
   - 例: 「学校は行けないけど、ここなら楽しく通ってます」
   - 例: 「ゲームばかりだった子が、今では自分でアプリを作っています」

2. **価値提示（3〜4文）**: 具体的なメリット、解決策、実績
   - ✅マークや数字を使って読みやすく
   - 具体的なエピソードや事例を含める
   - 信頼感を与える情報（実績、サポート体制など）

3. **CTA（1〜2文）**: 明確な行動喚起
   - 「無料体験実施中」「まずはお気軽にご相談ください」
   - 「プロフィールのリンクまたはDMへ」

### 投稿文の詳細ルール
- 投稿テキストは改行を使わず、句読点（、。）で区切る
- 200〜250文字程度の魅力的な文章
- 読者目線で書く（保護者の悩み、生徒の気持ちに寄り添う）
- 具体性を重視（「多くの生徒」より「小6男子」のように）
- 投稿テキストの後にスペースを入れてハッシュタグを続ける

### ハッシュタグ戦略
**必須ハッシュタグ（毎回含める）**: #if塾 #オンラインプログラミング #AI学習

**ローテーションハッシュタグ（投稿内容に応じて5〜7個選ぶ）**:
- 学習関連: #プログラミング教育 #マインクラフト教育 #起業家育成 #STEAM教育
- ターゲット: #小学生 #中学生 #高校生 #プログラミング初心者
- 保護者向け: #習い事 #オンライン習い事 #子どもの教育 #将来の選択肢
- 特徴: #個別指導 #少人数制 #AI先生 #メタバース学習
- 場所: #全国対応 #オンライン塾

合計8〜10個のハッシュタグを含める

## 投稿タイプと構成戦略（${calendarDays}日分に多様性を）

### 1. 保護者の悩み共感型（20%）
- **フック**: 保護者の悩みに共感する言葉
- **本文**: 具体的な解決事例、安心できる環境の提示
- **CTA**: 無料相談・体験授業への誘導
- **テーマ例**: 「学校以外の居場所」「子どもの可能性」「個別サポート」

### 2. 生徒の変化ストーリー型（20%）
- **フック**: 「〇〇だった子が今では〜」
- **本文**: 具体的なビフォーアフター、成長の過程
- **CTA**: 「あなたのお子さんも」という希望提示
- **テーマ例**: 成功事例、プロジェクト完成、自信の獲得

### 3. 情報提供・教育型（15%）
- **フック**: 「知ってましたか？」「実は〜」
- **本文**: プログラミング、AI、起業に関する有益情報
- **CTA**: もっと学びたい方は体験授業へ
- **テーマ例**: 学習Tips、業界トレンド、豆知識、プログラミング基礎

### 4. 実績・信頼構築型（15%）
- **フック**: 具体的な数字や実績
- **本文**: 生徒の作品、コンテスト入賞、継続率など
- **CTA**: 一緒に成長しませんか
- **テーマ例**: 生徒作品紹介、実績データ、受賞歴

### 5. 講師・メンター紹介型（10%）
- **フック**: 「こんな先生がいます」
- **本文**: 講師の専門性、人柄、サポート体制
- **CTA**: この先生に会ってみませんか
- **テーマ例**: 塾長、CTO、塾頭、各メンターの紹介

### 6. Q&A・不安解消型（10%）
- **フック**: 「よくある質問」
- **本文**: 具体的な疑問への回答
- **CTA**: 他に質問があればDMへ
- **テーマ例**: 料金、時間、サポート体制、学習内容

### 7. 日常風景・親近感型（10%）
- **フック**: 「今日の教室では」
- **本文**: リアルな授業風景、生徒の様子
- **CTA**: あなたも体験してみませんか
- **テーマ例**: 授業風景、生徒の取り組み、日常の一コマ

**重要**: ${calendarDays}日分の投稿で、上記の投稿タイプをバランス良く配分すること

## 重要な制約
- **1日=1行**（必ず13列を1行にまとめる）
- **各日の行の最後には必ず改行を入れる**（${calendarDays}日分=${calendarDays}行にする）
- ヘッダーは不要、データ行のみ${calendarDays}行出力
- フィールドにカンマが含まれる場合はダブルクォートで囲む
- **画像説明は必ず日本語**
- **テキスト内の改行は必ず「\\n」で表現**
- **全てのキャラクター設定と全ての一貫性ルールを活用すること**
- **${calendarDays}日分で、全キャラクターと全ルールがバランス良く登場するように配分する**
- **架空のキャラクターは絶対に作成しないこと。必ず上記のキャラクター設定リストから選択すること**
- **誇張表現を避けること**: 「天才」「最強」「完璧」「絶対」などの過度な表現は使用しない。落ち着いた、信頼できるトーンを保つ

## 出力フォーマット
以下のように、**必ず各日の行の後に改行を入れて、${calendarDays}行で出力してください**:

1日目の13列データ
2日目の13列データ
3日目の13列データ
${calendarDays > 3 ? '...（中略）...\n' + calendarDays + '日目の13列データ' : ''}

## 出力例（3日分）

【投稿1: 情報提供型（人物なし画像の例）】
"明るい教室の机の上に、マインクラフトの画面が映し出されたノートPCが置かれている。画面にはカラフルなブロックで作られた建築物とプログラミングコードが表示されている。自然光が差し込み、温かい雰囲気。デスクには筆記用具とノートが整然と並んでいる。一貫性ルール1適用。","遊びから\\n学びへ","マインクラフト\\nで楽しく\\nプログラミング\\n習得","PCモニターに映る、AIプログラミングの実行画面。マインクラフトのキャラクターがAIの指示通りに自動で建築をしている様子。コードエディタも画面に表示され、プログラムの流れが可視化されている。知的で活気ある雰囲気。一貫性ルール1適用。","AI先生\\nが24時間","いつでも\\n質問できる\\n安心感","塾長山﨑琢己がホワイトボードの前に立ち、プログラミングの基礎を説明している。ボードには「if文」の図解が描かれている。山﨑は紺のスウェットシャツ姿で、明るい笑顔。自然光が差し込む。一貫性ルール1適用。","基礎から\\n丁寧に","初心者でも\\n安心して\\n学べる環境","CTO井上陽斗と塾頭高崎翔太が笑顔で並んで立っている。井上は白いポロシャツとメガネ姿、高崎はグレーのニット帽と黒いジャケット、赤いパーカー姿。背景にはif(塾)のロゴと「無料体験受付中」の文字。希望に満ちた雰囲気。一貫性ルール1適用。","まずは\\n無料体験","プログラミング\\nの楽しさを\\n体感しよう","「プログラミング、難しそう…」と思っていませんか？if(塾)では、マインクラフトを使って楽しくプログラミングを学べます。✅ゲーム感覚で基礎が身につく ✅AI先生が24時間サポート ✅実践的なスキルが習得できる。初心者でも安心して始められる環境をご用意しています。無料体験実施中です。プロフィールのリンクまたはDMへ。 #if塾 #オンラインプログラミング #AI学習 #マインクラフト教育 #プログラミング初心者 #STEAM教育 #習い事 #全国対応"

【投稿2: 講師紹介型】
"明るい教室で、塾長山﨑琢己が笑顔で立っている。紺のスウェットシャツ姿で、手にはタブレット。背景には「未来を創る」というメッセージボード。温かく親しみやすい雰囲気。自然光が差し込む。一貫性ルール1適用。","塾長\\n紹介","教育と起業の\\n両方を知る\\nリーダー","CTO井上陽斗がPCの前に座り、複雑なコードを書いている様子。集中した表情だが、時折笑顔を見せる。白いポロシャツとメガネ姿。背景のモニターにはマインクラフトとAIシステムの統合画面。知的で活気ある雰囲気。一貫性ルール1適用。","技術の\\nCTO","AI開発の\\nプロフェッショナル\\nが直接指導","塾頭高崎翔太がタブレットを持ち、カメラに向かって優しい笑顔を見せている。グレーのニット帽、黒いジャケット、赤いパーカー姿。背景には「臨床心理士」「エンジニア」「コンサルタント」の文字。温かく落ち着いた雰囲気。一貫性ルール1適用。","心の\\nサポート","臨床心理士\\n経験が活きる\\n個別支援","塾長山﨑琢己、CTO井上陽斗、塾頭高崎翔太の3人が笑顔で並んで立っている。背景にはif(塾)のロゴ。それぞれの個性が光る。チームとしての一体感。明るく希望に満ちた雰囲気。一貫性ルール1適用。","プロの\\nチーム","3人の専門家が\\nあなたを\\n全力で\\nサポート","if(塾)の講師陣は、それぞれが異なる専門性を持つプロフェッショナル。塾長（教育と起業）、CTO（AI・システム開発）、塾頭（心理サポート）。多角的な視点から、あなたの「好き」を応援します。✅技術力 ✅ビジネス思考 ✅心のケア、全てが揃った環境で学びませんか？無料体験でこの講師陣に会ってみてください。 #if塾 #オンラインプログラミング #AI学習 #講師紹介 #メンター #プログラミング教育 #個別指導 #起業家育成"

【投稿3: 実績紹介型（人物なし画像の例）】
"PCモニターに映る、マインクラフトで作られた精巧な建築物。複雑な構造の城や街並みが、プログラミングによって自動生成されている様子。画面には「AI自動建築プログラム 完成」の文字。達成感に満ちた雰囲気。一貫性ルール1適用。","作品\\n紹介","プログラミング\\nで実現する\\n無限の創造力","学生起業家加賀屋結眞が自信に満ちた笑顔でプレゼンテーションをしている様子。スライドには自分が開発したアプリの画面。背景にはビジネスコンテストの会場。若々しくエネルギッシュな雰囲気。一貫性ルール1適用。","起業家\\n育成","ビジネス思考も\\n同時に学べる\\n実践的環境","eスポーツプレイヤー渡辺柚気が配信用のヘッドセットをつけ、PCの前で真剣な表情でゲームをプレイしている。モニターにはeスポーツの競技画面。プロの道を目指す情熱が伝わる雰囲気。一貫性ルール1適用。","eスポーツ\\nの道","プロを目指す\\n仲間と共に\\n切磋琢磨","if(塾)のロゴと、これまでの実績を示す統計グラフ。「AI甲子園全国5位」「継続率90%」「作品完成率85%」などの数字が表示されている。信頼感のあるデザイン。明るく希望に満ちた雰囲気。一貫性ルール1適用。","確かな\\n実績","数字が証明する\\n質の高い\\n学習環境","if(塾)では、様々な目標を持つ仲間が学んでいます。AI開発、起業、eスポーツ、それぞれの夢に向かって成長中。✅AI甲子園全国5位の実績 ✅継続率90%の学習環境 ✅一人ひとりの目標に合わせたサポート。あなたも自分の「好き」を極めてみませんか？無料体験で可能性を発見してください。 #if塾 #オンラインプログラミング #AI学習 #起業家育成 #eスポーツ #実績 #プログラミング教育 #個別指導"

**上記のように、必ず${calendarDays}日分、${calendarDays}行のCSVを出力してください。各行の最後には改行を入れてください。**
`;

    console.log('🤖 Gemini AIでカレンダーを生成中...');
    console.log('⏳ 処理には1〜2分かかる場合があります\n');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let calendarCSV = response.text().trim();

    // コードブロックのマークダウンを削除
    calendarCSV = calendarCSV.replace(/```csv\n/g, '').replace(/```\n/g, '').replace(/```/g, '');

    // タイムスタンプを生成
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];

    // calendarフォルダに保存
    const calendarDir = join(__dirname, '..', 'calendar');
    if (!existsSync(calendarDir)) {
      mkdirSync(calendarDir, { recursive: true });
      console.log('📁 calendarフォルダを作成しました');
    }
    const calendarPath = join(calendarDir, `calendar_${timestamp}.csv`);
    writeFileSync(calendarPath, calendarCSV, 'utf-8');

    // 保存確認
    if (existsSync(calendarPath)) {
      console.log(`✅ カレンダー履歴に保存しました: ${calendarPath}`);
    } else {
      console.warn(`⚠️  警告: カレンダー履歴への保存に失敗した可能性があります`);
    }

    // outputフォルダにも保存（後方互換性のため）
    const csvPath = join(__dirname, '..', 'output', 'calendar.csv');
    writeFileSync(csvPath, calendarCSV, 'utf-8');

    console.log('✅ カレンダーCSVを生成しました');
    console.log(`💾 保存先（メイン）: ${calendarPath}`);
    console.log(`💾 保存先（バックアップ）: ${csvPath}\n`);

    // CSVをパースして検証
    const lines = calendarCSV.split('\n').filter(line => line.trim());
    console.log(`📊 生成された投稿数: ${lines.length}日分\n`);

    // サンプルを表示
    if (lines.length > 0) {
      console.log('📝 最初の投稿のプレビュー:');
      const firstLine = parseCSVLine(lines[0]);
      console.log(`  列数: ${firstLine.length}列`);
      console.log('  表紙画像: ', firstLine[0]?.substring(0, 60) + '...');
      console.log('  表紙テキスト1: ', firstLine[1]);
      console.log('  表紙テキスト2: ', firstLine[2]);
      console.log('  投稿テキスト: ', firstLine[12]?.substring(0, 80) + '...');
    }

    return csvPath;
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

/**
 * CSV行をパース（クォート対応）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// メイン処理
generateCalendar();
