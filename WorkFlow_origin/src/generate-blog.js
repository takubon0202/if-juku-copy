import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ブログトピックのカテゴリー
const BLOG_TOPICS = [
  {
    category: 'AI・ICT',
    keywords: ['AI', 'ICT', '人工知能', 'プログラミング', 'テクノロジー', 'ChatGPT', 'Gemini', '機械学習', '自動化'],
    angle: '発達特性を持つ人がAI・ICTを活用して成長した事例や可能性'
  },
  {
    category: '発達障害とテクノロジー',
    keywords: ['発達障害', 'ADHD', 'ASD', '自閉スペクトラム症', '注意欠陥', '多動性', 'ICT支援', 'AI活用'],
    angle: '発達障害とAI・ICTの相性の良さ、才能開花の可能性'
  },
  {
    category: 'ゲームと成長',
    keywords: ['マインクラフト', 'Minecraft', 'ゲーム', 'プログラミング教育', 'コマンドブロック', '論理的思考'],
    angle: 'ゲームを通じた学習効果、発達特性を活かした創造性の発揮'
  },
  {
    category: 'eスポーツ',
    keywords: ['ストリートファイター6', 'SF6', 'FPS', 'eスポーツ', '格闘ゲーム', '大会', '競技'],
    angle: '集中力や反応速度など発達特性を活かしたeスポーツでの活躍'
  },
  {
    category: '起業・キャリア',
    keywords: ['起業', '学生起業', 'キャリア', 'フリーランス', '副業', 'スキルアップ'],
    angle: '発達特性を持つ人の起業やキャリア形成での成功事例'
  },
  {
    category: '才能開花',
    keywords: ['才能開花', '特性活用', '強み', '個性', '成長', '自己実現', '可能性'],
    angle: '発達特性を「障害」ではなく「才能」として活かす方法'
  }
];

// SEOキーワード（検索順位を上げたいキーワード）
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
  'if塾'
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
 * Gemini APIでブログ記事を生成
 */
async function generateBlogContent(apiKey) {
  const topic = selectRandomTopic();
  const seoKeywords = selectRandomSEOKeywords(3);

  console.log(`\n📝 トピック: ${topic.category}`);
  console.log(`🔍 SEOキーワード: ${seoKeywords.join(', ')}`);

  const prompt = `あなたはif塾という発達障害支援とICT教育を行う塾のブログライターです。

以下の条件で魅力的なブログ記事を生成してください：

【テーマカテゴリ】${topic.category}
【キーワード】${topic.keywords.join(', ')}
【記事の視点】${topic.angle}
【SEO対象キーワード】${seoKeywords.join(', ')}

【記事の要件】
1. タイトルは魅力的でSEOを意識したもの（30〜60文字）
2. 記事は3〜5セクションに分割
3. 各セクションには見出し（h2）とその内容を記述
4. 発達特性を持つ人の成功体験や可能性に焦点を当てる
5. 具体的な事例やデータを含める
6. 読者の行動を促すCTA（行動喚起）を含める
7. if塾の活動と関連付ける
8. 前向きで希望を持てる内容にする
9. SEOキーワードを自然に記事内に含める

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
      "imagePrompt": "このセクションに合う画像の説明（英語、日本の若者が活躍するシーン）"
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
 * Gemini APIで画像を生成
 */
async function generateBlogImage(apiKey, imagePrompt, index) {
  console.log(`  🎨 画像${index}を生成中...`);

  const enhancedPrompt = `Create a vibrant, modern illustration for a blog about education and technology in Japan. Scene: ${imagePrompt}. Style: Clean, professional, inspiring, suitable for educational content. NO TEXT, NO LETTERS, NO WORDS in the image. The image should feature Japanese young people in a positive, empowering context.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateImages?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          responseModalities: ['image'],
          imageConfig: { aspectRatio: '16:9' }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      for (const part of parts) {
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
 * 記事IDを生成（既存の記事との重複を避ける）
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

  // 新しいIDを生成（最大ID + ランダム値）
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
      const imageBuffer = await generateBlogImage(apiKey, section.imagePrompt, i + 1);

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
      await new Promise(resolve => setTimeout(resolve, 2000));
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

    // 生成情報をJSONで出力（CI/CD用）
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
