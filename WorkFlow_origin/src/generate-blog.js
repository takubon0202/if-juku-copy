import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// キャラクター定義と役割
// 高崎以外のメンバーは高校生の時に高崎と出会い、発達特性を持ちながら尖った体験をしている
const CHARACTERS = {
  '塾頭高崎翔太': {
    name: '塾頭高崎翔太',
    displayName: '塾頭',
    role: '塾頭',
    topics: ['教育', 'AI開発', '発達障害の専門知識', 'ICT教育', 'プログラミング教育', '臨床心理'],
    background: '臨床心理士・ITエンジニアとして、発達特性を持つ子どもたちの可能性を信じ、if塾を立ち上げた'
  },
  '塾長山﨑琢己': {
    name: '塾長山﨑琢己',
    displayName: '塾長',
    role: '塾長',
    topics: ['学生交流', '執筆', '発達障害の体験談', '特別支援級', '国立大学進学', '成長体験'],
    background: 'ADHD・ASDの診断を受け、中学時代は特別支援学級に通っていたが、高校で塾頭と出会い、国立大学に進学。自身の経験を活かして後輩たちを支援'
  },
  'CTO井上陽斗': {
    name: 'CTO井上陽斗',
    displayName: 'CTO',
    role: 'CTO',
    topics: ['マインクラフト', 'AI開発', 'プログラミング', 'コマンドブロック', 'ゲーム開発'],
    background: '高校生の時に塾頭と出会い、ゲームへの情熱をプログラミングスキルに昇華。発達特性を活かした集中力で技術を磨いている'
  },
  '学生起業家加賀屋結眞': {
    name: '学生起業家加賀屋結眞',
    displayName: '学生起業家',
    role: '学生起業家',
    topics: ['起業', 'ビジコン', 'ビジネス', 'スタートアップ', '学生起業'],
    background: '高校生の時に塾頭と出会い、15歳で個人事業主として起業。発達特性による独自の視点をビジネスに活かしている'
  },
  'eスポーツプレイヤー渡辺柚気': {
    name: 'eスポーツプレイヤー渡辺柚気',
    displayName: 'Y君',
    role: 'eスポーツプレイヤー',
    topics: ['eスポーツ', 'ストリートファイター6', 'FPS', '格闘ゲーム', '大会', '競技ゲーム'],
    background: '高校生の時に塾頭と出会い、発達特性による集中力と反応速度をeスポーツで発揮。大会で優勝経験を持つ'
  }
};

// if塾の理念とターゲット
const IF_JUKU_MISSION = {
  origin: 'それぞれが発達特性を持ちながら尖った体験をしたメンバーが集まり、同じような体験をまだ見ぬ子どもたちにも届けたいという想いからif塾は生まれた',
  targets: [
    '不安感が強く、自分に自信が持てない子ども',
    '成功体験に乏しく、何をやってもうまくいかないと感じている子ども',
    '発達特性を持ち、学校になじめない子ども',
    '好きなことはあるが、それを活かす方法がわからない子ども',
    '独自の成長を遂げたいと思っている子ども'
  ],
  values: [
    '発達特性は「障害」ではなく「才能」になりうる',
    '好きなことに没頭する力は大きな強みになる',
    '小さな成功体験の積み重ねが自信につながる',
    '仲間との出会いが人生を変える',
    '自分らしい成長の形がある'
  ]
};

// ブログトピックのカテゴリー（キャラクター割り当て付き）
const BLOG_TOPICS = [
  {
    category: 'AI・ICT教育',
    keywords: ['AI', 'ICT', '人工知能', 'プログラミング', 'テクノロジー', 'ChatGPT', 'Gemini', '機械学習'],
    angle: '発達特性を持つ人がAI・ICTを活用して成長した事例や可能性',
    mainCharacter: '塾頭高崎翔太',
    subCharacters: ['CTO井上陽斗', '塾長山﨑琢己']
  },
  {
    category: '発達障害と成長',
    keywords: ['発達障害', 'ADHD', 'ASD', '自閉スペクトラム症', '特別支援', '成長', '克服'],
    angle: '発達障害の体験談と成長ストーリー、支援級から国立大学への進学',
    mainCharacter: '塾長山﨑琢己',
    subCharacters: ['塾頭高崎翔太']
  },
  {
    category: 'マインクラフト教育',
    keywords: ['マインクラフト', 'Minecraft', 'コマンドブロック', 'プログラミング教育', '論理的思考', 'ゲーム開発'],
    angle: 'ゲームを通じた学習効果、発達特性を活かした創造性の発揮',
    mainCharacter: 'CTO井上陽斗',
    subCharacters: ['塾長山﨑琢己', '塾頭高崎翔太']
  },
  {
    category: 'eスポーツ',
    keywords: ['ストリートファイター6', 'SF6', 'FPS', 'eスポーツ', '格闘ゲーム', '大会', '競技'],
    angle: '集中力や反応速度など発達特性を活かしたeスポーツでの活躍',
    mainCharacter: 'eスポーツプレイヤー渡辺柚気',
    subCharacters: ['塾長山﨑琢己', '塾頭高崎翔太']
  },
  {
    category: '起業・キャリア',
    keywords: ['起業', '学生起業', 'ビジコン', 'キャリア', 'フリーランス', 'スタートアップ'],
    angle: '発達特性を持つ人の起業やキャリア形成での成功事例',
    mainCharacter: '学生起業家加賀屋結眞',
    subCharacters: ['塾頭高崎翔太', '塾長山﨑琢己']
  },
  {
    category: '才能開花',
    keywords: ['才能開花', '特性活用', '強み', '個性', '成長', '自己実現', '可能性'],
    angle: '発達特性を「障害」ではなく「才能」として活かす方法',
    mainCharacter: '塾頭高崎翔太',
    subCharacters: ['塾長山﨑琢己', '学生起業家加賀屋結眞']
  }
];

// SEOキーワード
const SEO_KEYWORDS = [
  '発達障害 AI',
  '発達障害 プログラミング',
  'ADHD ゲーム 集中力',
  'ASD ICT 才能',
  'マインクラフト 教育',
  'Minecraft コマンド',
  'ストリートファイター6 上達',
  'eスポーツ 発達障害',
  '発達特性 強み',
  '学生起業 IT',
  'プログラミング教室 秋田',
  'if塾',
  '特別支援級 大学進学'
];

/**
 * ランダムにトピックを選択
 */
function selectRandomTopic() {
  return BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];
}

/**
 * ランダムにSEOキーワードを選択
 */
function selectRandomSEOKeywords(count = 3) {
  const shuffled = [...SEO_KEYWORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * キャラクター画像を読み込む
 */
function loadCharacterImages(characterName) {
  const characterDir = join(__dirname, '..', 'character', characterName);

  if (!existsSync(characterDir)) {
    console.log(`  ⚠️ キャラクターフォルダが見つかりません: ${characterDir}`);
    return null;
  }

  try {
    const files = readdirSync(characterDir);
    const imageFiles = files.filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
    });

    if (imageFiles.length === 0) {
      console.log(`  ⚠️ キャラクター画像が見つかりません: ${characterDir}`);
      return null;
    }

    const images = [];
    for (const file of imageFiles) {
      const imagePath = join(characterDir, file);
      const imageBuffer = readFileSync(imagePath);
      const base64Data = imageBuffer.toString('base64');

      let mimeType = 'image/png';
      if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }

      images.push({
        data: base64Data,
        mimeType: mimeType,
        filename: file
      });
    }

    console.log(`  📸 ${images.length}枚の参照画像を読み込みました`);
    return images;
  } catch (error) {
    console.error(`  ❌ キャラクター画像の読み込みに失敗: ${error.message}`);
    return null;
  }
}

/**
 * Gemini APIでブログ記事を生成
 */
async function generateBlogContent(apiKey) {
  const topic = selectRandomTopic();
  const seoKeywords = selectRandomSEOKeywords(3);

  console.log(`\n📝 トピック: ${topic.category}`);
  console.log(`🎭 メインキャラクター: ${CHARACTERS[topic.mainCharacter].displayName}`);
  console.log(`🔍 SEOキーワード: ${seoKeywords.join(', ')}`);

  // キャラクターの表示名を取得（Y君の場合は特別処理）
  const mainChar = CHARACTERS[topic.mainCharacter];
  const mainCharDisplayName = mainChar.displayName;

  const prompt = `あなたはif塾という発達障害支援とICT教育を行う塾のブログライターです。

【if塾について】
${IF_JUKU_MISSION.origin}

【if塾の価値観】
${IF_JUKU_MISSION.values.map(v => `・${v}`).join('\n')}

【ターゲット読者】
${IF_JUKU_MISSION.targets.map(t => `・${t}`).join('\n')}

以下の条件で魅力的なブログ記事を生成してください：

【テーマカテゴリ】${topic.category}
【キーワード】${topic.keywords.join(', ')}
【記事の視点】${topic.angle}
【SEO対象キーワード】${seoKeywords.join(', ')}

【登場キャラクター】
メイン: ${mainCharDisplayName}（${mainChar.role}）
背景: ${mainChar.background}
サブ: ${topic.subCharacters.map(c => `${CHARACTERS[c].displayName}（${CHARACTERS[c].background}）`).join('\n')}

【記事の要件】
1. タイトルは魅力的でSEOを意識したもの（30〜60文字）
2. 記事は3〜4セクションに分割
3. 各セクションには見出し（h2）とその内容を記述
4. 発達特性を持つ人の成功体験や可能性に焦点を当てる
5. メンバーの実体験に基づいた具体的なストーリーを含める
6. 読者（不安を抱える子どもや保護者）に寄り添い、希望を与える内容にする
7. if塾での出会いや成長体験を織り交ぜる
8. 前向きで温かみのある文体で書く
9. SEOキーワードを自然に記事内に含める
10. 各セクションで登場するキャラクターを明記する

【禁止事項】
- 年商〇〇万円などの具体的な金額表現は使わない
- 過度に成功を煽る表現は避ける
- 発達障害を否定的に描写しない

【キャラクター使用ルール】
- ${mainCharDisplayName}をメインで登場させる
- 塾頭以外のメンバーは高校生の時に塾頭と出会った経験を持つ
- 各セクションでどのキャラクターが活躍するか指定する
- eスポーツプレイヤーはブログ内では「Y君」として登場させる
- メンバーの背景ストーリーを活かした内容にする
- 本名は使わず、役職名のみで呼ぶ（塾頭、塾長、CTO、学生起業家、Y君）

【出力形式】以下のJSON形式で出力してください：
{
  "title": "記事タイトル",
  "description": "メタディスクリプション（120文字以内）",
  "category": "カテゴリ名",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "sections": [
    {
      "heading": "セクション見出し",
      "content": "セクション本文（HTMLタグ使用可：p, ul, li, strong, em）",
      "characterName": "このセクションで登場するキャラクター名（塾頭高崎翔太/塾長山﨑琢己/CTO井上陽斗/学生起業家加賀屋結眞/eスポーツプレイヤー渡辺柚気）",
      "sceneDescription": "このセクションの画像シーン説明（日本語、キャラクターが何をしているか具体的に）"
    }
  ]
}

重要：JSON形式のみで出力し、説明文は含めないでください。`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSONが見つかりません');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ ブログ生成エラー:', error.message);
    throw error;
  }
}

/**
 * Gemini APIでキャラクター画像を生成（gemini-2.5-flash-image使用）
 */
async function generateBlogImage(apiKey, sceneDescription, characterName, index) {
  console.log(`  🎨 画像${index}を生成中... (${CHARACTERS[characterName]?.displayName || characterName})`);

  // キャラクター画像を読み込む
  const characterImages = loadCharacterImages(characterName);

  if (!characterImages || characterImages.length === 0) {
    console.log(`  ⚠️ キャラクター画像が見つかりません: ${characterName}`);
    return null;
  }

  // Y君の場合は特別な表示名を使用
  const displayName = characterName === 'eスポーツプレイヤー渡辺柚気' ? 'Y君' : CHARACTERS[characterName].displayName;

  const enhancedPrompt = `CRITICAL: Keep the person EXACTLY as shown in the reference images. DO NOT change their face, facial features, hairstyle, hair color, skin tone, or clothing style. The person's identity and appearance must remain 100% identical across all reference images.

Scene: ${sceneDescription}
Character: ${displayName} from if塾

Create an illustration showing this exact person in the described scene. Style: Clean, professional, modern Japanese educational setting, inspiring atmosphere.

IMPORTANT: NO TEXT, NO LETTERS, NO WORDS, NO WRITING in the image. Use clean surfaces without any text.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    // パーツ配列を準備（キャラクター画像 + プロンプト）
    const parts = [];

    // 全てのキャラクター画像をパーツに追加
    for (const image of characterImages) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    // プロンプトを追加
    parts.push({ text: enhancedPrompt });

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        responseModalities: ['image', 'text'],
        temperature: 0.4
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseParts = data.candidates[0].content.parts;
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }

    throw new Error('画像データが見つかりません');
  } catch (error) {
    console.error(`  ❌ 画像${index}生成失敗:`, error.message);
    return null;
  }
}

/**
 * 記事IDを生成
 */
function generateArticleId(postsDir) {
  const existingIds = [];

  if (existsSync(postsDir)) {
    const files = readdirSync(postsDir);
    files.forEach(file => {
      const match = file.match(/^(\d+)_/);
      if (match) {
        existingIds.push(parseInt(match[1]));
      }
    });
  }

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 5000;
  return maxId + Math.floor(Math.random() * 100) + 1;
}

/**
 * HTMLファイルを生成
 */
function generateHTML(blogData, articleId, imageFilenames) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;

  let sectionsHTML = '';

  blogData.sections.forEach((section, index) => {
    const imageFilename = imageFilenames[index];
    const imageHTML = imageFilename
      ? `<img src="../blog-images/${imageFilename}" alt="${section.heading}" style="width: 100%; max-width: 800px; height: auto; border-radius: 10px; margin: 2rem auto; display: block;">`
      : '';

    sectionsHTML += `
        <h2>${section.heading}</h2>
        ${imageHTML}
        ${section.content}
`;
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blogData.title} - if(塾)</title>
    <meta name="description" content="${blogData.description}">
    <meta name="keywords" content="${blogData.tags.join(', ')}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #00ffcc;
            --secondary-color: #ff00ff;
            --accent-color: #00ff00;
            --bg-dark: #0a0a0a;
            --bg-secondary: #1a1a2e;
            --text-light: #ffffff;
            --text-gray: #b0b0b0;
            --neon-glow: 0 0 20px rgba(0, 255, 204, 0.5);
            --purple-glow: 0 0 30px rgba(255, 0, 255, 0.3);
        }

        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-light);
            overflow-x: hidden;
            position: relative;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background:
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 255, 204, 0.03) 2px,
                    rgba(0, 255, 204, 0.03) 4px
                );
            pointer-events: none;
            z-index: 1;
        }

        .nav-container {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 1000;
            padding: 20px;
        }

        .hamburger {
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid var(--primary-color);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
        }

        .hamburger:hover {
            background: rgba(0, 255, 204, 0.1);
            box-shadow: var(--neon-glow);
        }

        .hamburger-line {
            width: 24px;
            height: 2px;
            background: var(--primary-color);
            transition: all 0.3s ease;
        }

        .nav-menu {
            position: fixed;
            top: 0;
            right: -300px;
            width: 300px;
            height: 100vh;
            background: rgba(26, 26, 46, 0.95);
            backdrop-filter: blur(20px);
            border-left: 1px solid var(--primary-color);
            transition: right 0.3s ease;
            z-index: 999;
        }

        .nav-menu.active {
            right: 0;
        }

        .nav-menu ul {
            list-style: none;
            padding: 100px 0 0 0;
            margin: 0;
        }

        .nav-menu a {
            display: block;
            padding: 20px 40px;
            color: var(--text-light);
            text-decoration: none;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(0, 255, 204, 0.1);
        }

        .nav-menu a:hover {
            background: rgba(0, 255, 204, 0.1);
            color: var(--primary-color);
        }

        .post-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 100px 20px 60px;
            position: relative;
            z-index: 10;
        }

        .breadcrumb {
            font-size: 0.9rem;
            color: var(--text-gray);
            margin-bottom: 2rem;
        }

        .breadcrumb a {
            color: var(--primary-color);
            text-decoration: none;
        }

        .breadcrumb a:hover {
            color: var(--secondary-color);
        }

        .post-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            font-size: 0.9rem;
            color: var(--text-gray);
            flex-wrap: wrap;
        }

        .post-date {
            background: rgba(0, 255, 204, 0.1);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            border: 1px solid var(--primary-color);
        }

        .post-categories {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .category-tag {
            background: rgba(255, 0, 255, 0.1);
            color: var(--secondary-color);
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            border: 1px solid var(--secondary-color);
            font-size: 0.8rem;
        }

        .post-title {
            font-size: clamp(1.8rem, 4vw, 2.5rem);
            font-weight: 700;
            margin-bottom: 2rem;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1.3;
        }

        .post-content {
            line-height: 1.8;
            font-size: 1.1rem;
        }

        .post-content p {
            margin-bottom: 1.5rem;
        }

        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 2rem 0;
            border: 1px solid rgba(0, 255, 204, 0.3);
        }

        .post-content h2 {
            color: var(--primary-color);
            margin: 3rem 0 1.5rem;
            font-size: 1.7rem;
            border-left: 4px solid var(--primary-color);
            padding-left: 1rem;
        }

        .post-content ul, .post-content ol {
            margin: 1.5rem 0;
            padding-left: 2rem;
        }

        .post-content li {
            margin-bottom: 0.5rem;
        }

        .post-content strong {
            color: var(--primary-color);
        }

        .back-to-list {
            display: inline-block;
            margin-top: 3rem;
            padding: 1rem 2rem;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            color: var(--bg-dark);
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: var(--neon-glow);
        }

        .back-to-list:hover {
            transform: translateY(-2px);
            box-shadow: var(--purple-glow);
        }

        @media (max-width: 768px) {
            .post-container {
                padding: 80px 15px 40px;
            }

            .post-title {
                font-size: 1.5rem;
            }

            .post-content {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="nav-container">
        <div class="hamburger" onclick="toggleNav()">
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
        </div>
        <nav class="nav-menu">
            <ul>
                <li><a href="../index.html">ホーム</a></li>
                <li><a href="../materials.html">教材</a></li>
                <li><a href="../news.html">お知らせ</a></li>
            </ul>
        </nav>
    </div>

    <div class="post-container">
        <nav class="breadcrumb">
            <a href="../index.html">ホーム</a> /
            <a href="../news.html">お知らせ</a> /
            <span>${blogData.title}</span>
        </nav>

        <div class="post-meta">
            <div class="post-date">${dateStr}</div>
            <div class="post-categories">
                <span class="category-tag">${blogData.category}</span>
                ${blogData.tags.map(tag => `<span class="category-tag">${tag}</span>`).join('\n                ')}
            </div>
        </div>

        <h1 class="post-title">${blogData.title}</h1>

        <div class="post-content">
            ${sectionsHTML}

            <div style="margin-top: 3rem; padding: 2rem; background: rgba(0, 255, 204, 0.05); border: 1px solid var(--primary-color); border-radius: 10px;">
                <h2 style="color: var(--primary-color); margin-bottom: 1rem;">🎯 興味を持っていただいた方へ</h2>
                <p>if塾では、発達特性を持つ子どもたちの「好き」を「才能」に変える教育を行っています。現在の記事内容と実際の活動に大きなズレはありませんが、詳細については直接お問い合わせください。</p>
                <ul style="margin: 1rem 0;">
                    <li><strong>📝 お問い合わせフォーム</strong>: <a href="../index.html#contact" style="color: var(--primary-color);">こちらから</a></li>
                    <li><strong>🎓 体験授業</strong>: 無料体験授業を実施中です</li>
                    <li><strong>📱 Instagram</strong>: <a href="https://www.instagram.com/if_juku/" target="_blank" style="color: var(--primary-color);">@if_juku</a></li>
                    <li><strong>💬 LINE公式アカウント</strong>: 最新情報をお届けします</li>
                </ul>
            </div>

            <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(255, 0, 255, 0.05); border: 1px solid var(--secondary-color); border-radius: 10px; font-size: 0.9rem; color: var(--text-gray);">
                <h3 style="color: var(--secondary-color); margin-bottom: 0.5rem;">📌 記事について</h3>
                <p>この記事は、塾頭による完全自動化への挑戦としてAIが自動生成しています。将来的には塾頭が執筆しているような記事になることを目指しており、現時点では事実と異なる内容が含まれる可能性があります。最新の正確な情報については、お問い合わせフォームよりご確認ください。</p>
                <p style="margin-top: 0.5rem;">🤖 Generated with AI - if塾のブログ自動化プロジェクト</p>
            </div>
        </div>

        <a href="../news.html" class="back-to-list">← お知らせ一覧に戻る</a>
    </div>

    <script>
        function toggleNav() {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.toggle('active');
        }

        document.addEventListener('click', function(event) {
            const navContainer = document.querySelector('.nav-container');
            const navMenu = document.querySelector('.nav-menu');

            if (!navContainer.contains(event.target)) {
                navMenu.classList.remove('active');
            }
        });
    </script>
</body>
</html>`;
}

/**
 * メイン処理
 */
async function generateBlog() {
  console.log('📝 ブログ記事自動生成を開始...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  // 出力ディレクトリ
  const postsDir = join(__dirname, '..', '..', 'posts');
  const imagesDir = join(__dirname, '..', '..', 'blog-images');

  if (!existsSync(postsDir)) {
    mkdirSync(postsDir, { recursive: true });
  }
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  try {
    // 1. ブログコンテンツを生成
    console.log('🤖 Gemini APIでブログコンテンツを生成中...');
    const blogData = await generateBlogContent(apiKey);
    console.log(`✅ タイトル: ${blogData.title}`);

    // 2. 各セクションの画像を生成
    console.log('\n🖼️ セクション画像を生成中...');
    const imageFilenames = [];

    for (let i = 0; i < blogData.sections.length; i++) {
      const section = blogData.sections[i];
      const characterName = section.characterName || '塾頭高崎翔太';
      const sceneDescription = section.sceneDescription || section.heading;

      const imageBuffer = await generateBlogImage(apiKey, sceneDescription, characterName, i + 1);

      if (imageBuffer) {
        const timestamp = Date.now();
        const filename = `blog_${timestamp}_${i + 1}.png`;
        const imagePath = join(imagesDir, filename);
        writeFileSync(imagePath, imageBuffer);
        imageFilenames.push(filename);
        console.log(`  ✅ ${filename} 保存完了`);
      } else {
        imageFilenames.push(null);
      }

      // API制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 3. HTMLファイルを生成
    console.log('\n📄 HTMLファイルを生成中...');
    const articleId = generateArticleId(postsDir);
    const safeTitle = blogData.title.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 50);
    const filename = `${articleId}_${safeTitle}.html`;
    const html = generateHTML(blogData, articleId, imageFilenames);

    const htmlPath = join(postsDir, filename);
    writeFileSync(htmlPath, html);

    console.log(`\n✅ ブログ記事生成完了!`);
    console.log(`📁 ファイル: ${filename}`);
    console.log(`📊 画像数: ${imageFilenames.filter(f => f).length}枚`);

    // 生成情報をJSONで出力
    const outputInfo = {
      filename,
      title: blogData.title,
      category: blogData.category,
      tags: blogData.tags,
      images: imageFilenames.filter(f => f),
      generatedAt: new Date().toISOString()
    };

    const infoPath = join(__dirname, '..', 'output', 'blog-info.json');
    writeFileSync(infoPath, JSON.stringify(outputInfo, null, 2));

    return outputInfo;
  } catch (error) {
    console.error('❌ ブログ生成に失敗:', error.message);
    process.exit(1);
  }
}

// 実行
generateBlog();
