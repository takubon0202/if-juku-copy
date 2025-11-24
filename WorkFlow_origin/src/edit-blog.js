import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// キャラクター定義
const CHARACTERS = {
  '塾頭高崎翔太': { displayName: '高崎先生' },
  '塾長山﨑琢己': { displayName: '山﨑塾長' },
  'CTO井上陽斗': { displayName: '井上CTO' },
  '学生起業家加賀屋結眞': { displayName: '加賀屋' },
  'eスポーツプレイヤー渡辺柚気': { displayName: 'Y君' }
};

/**
 * キャラクター画像を読み込む
 */
function loadCharacterImages(characterName) {
  const characterDir = join(__dirname, '..', 'character', characterName);

  if (!existsSync(characterDir)) {
    return null;
  }

  try {
    const files = readdirSync(characterDir);
    const imageFiles = files.filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
    });

    if (imageFiles.length === 0) {
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
        mimeType: mimeType
      });
    }

    return images;
  } catch (error) {
    return null;
  }
}

/**
 * HTMLファイルからセクション情報を抽出
 */
function extractSectionsFromHTML(htmlContent) {
  const sections = [];

  // h2とその後のコンテンツを抽出
  const sectionRegex = /<h2>([^<]+)<\/h2>\s*(?:<img[^>]*src="[^"]*\/([^"]+)"[^>]*>)?\s*([\s\S]*?)(?=<h2>|<a href="\.\.\/news\.html")/g;

  let match;
  while ((match = sectionRegex.exec(htmlContent)) !== null) {
    sections.push({
      heading: match[1],
      image: match[2] || null,
      content: match[3].trim()
    });
  }

  return sections;
}

/**
 * Gemini APIでテキストを編集
 */
async function editTextWithGemini(apiKey, originalContent, editPrompt) {
  console.log('🤖 Gemini APIでテキストを編集中...');

  const prompt = `以下のブログ記事の内容を、指定された指示に従って編集してください。

【元の内容】
${originalContent}

【編集指示】
${editPrompt}

【注意事項】
- HTMLタグ（p, ul, li, strong, em）は保持してください
- 年商〇〇万円などの具体的な金額表現は使わないでください
- 発達障害を否定的に描写しないでください
- 前向きで温かみのある文体を維持してください

編集後のHTMLコンテンツのみを出力してください（説明文は不要）：`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('❌ テキスト編集エラー:', error.message);
    throw error;
  }
}

/**
 * Gemini APIで画像を再生成
 */
async function regenerateImage(apiKey, sceneDescription, characterName) {
  console.log(`🎨 画像を再生成中... (${CHARACTERS[characterName]?.displayName || characterName})`);

  const characterImages = loadCharacterImages(characterName);

  if (!characterImages || characterImages.length === 0) {
    console.log(`⚠️ キャラクター画像が見つかりません: ${characterName}`);
    return null;
  }

  const displayName = characterName === 'eスポーツプレイヤー渡辺柚気' ? 'Y君' : CHARACTERS[characterName].displayName;

  const enhancedPrompt = `CRITICAL: Keep the person EXACTLY as shown in the reference images. DO NOT change their face, facial features, hairstyle, hair color, skin tone, or clothing style.

Scene: ${sceneDescription}
Character: ${displayName} from if塾

Create an illustration showing this exact person in the described scene. Style: Clean, professional, modern Japanese educational setting, inspiring atmosphere.

IMPORTANT: NO TEXT, NO LETTERS, NO WORDS in the image.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const parts = [];
    for (const image of characterImages) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }
    parts.push({ text: enhancedPrompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          responseModalities: ['image', 'text'],
          temperature: 0.4
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Image API Error: ${response.status}`);
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
    console.error(`❌ 画像生成失敗:`, error.message);
    return null;
  }
}

/**
 * メイン処理
 */
async function editBlog() {
  console.log('📝 ブログ記事編集を開始...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  // 環境変数から編集パラメータを取得
  const blogFilename = process.env.BLOG_FILENAME;
  const editPrompt = process.env.EDIT_PROMPT;
  const editType = process.env.EDIT_TYPE || 'text'; // 'text', 'image', 'both'
  const sectionIndex = parseInt(process.env.SECTION_INDEX || '0');
  const characterName = process.env.CHARACTER_NAME || '塾頭高崎翔太';
  const imagePrompt = process.env.IMAGE_PROMPT || '';

  if (!blogFilename) {
    throw new Error('BLOG_FILENAMEが指定されていません');
  }

  const postsDir = join(__dirname, '..', '..', 'posts');
  const imagesDir = join(__dirname, '..', '..', 'blog-images');
  const blogPath = join(postsDir, blogFilename);

  if (!existsSync(blogPath)) {
    throw new Error(`ブログファイルが見つかりません: ${blogFilename}`);
  }

  console.log(`📄 編集対象: ${blogFilename}`);
  console.log(`📝 編集タイプ: ${editType}`);

  // HTMLファイルを読み込む
  let htmlContent = readFileSync(blogPath, 'utf-8');
  const sections = extractSectionsFromHTML(htmlContent);

  console.log(`📊 セクション数: ${sections.length}`);

  // テキスト編集
  if ((editType === 'text' || editType === 'both') && editPrompt) {
    console.log('\n🔤 テキストを編集中...');

    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      const section = sections[sectionIndex];
      const editedContent = await editTextWithGemini(apiKey, section.content, editPrompt);

      // HTMLを更新
      const oldSectionRegex = new RegExp(
        `(<h2>${section.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/h2>\\s*(?:<img[^>]*>)?\\s*)([\\s\\S]*?)(?=<h2>|<a href="\\.\\.\\/news\\.html")`,
        'g'
      );
      htmlContent = htmlContent.replace(oldSectionRegex, `$1${editedContent}\n        `);

      console.log(`✅ セクション${sectionIndex + 1}のテキストを更新しました`);
    } else {
      console.log('⚠️ 指定されたセクションが見つかりません');
    }
  }

  // 画像再生成
  if ((editType === 'image' || editType === 'both') && imagePrompt) {
    console.log('\n🖼️ 画像を再生成中...');

    const imageBuffer = await regenerateImage(apiKey, imagePrompt, characterName);

    if (imageBuffer) {
      const timestamp = Date.now();
      const newImageFilename = `blog_edit_${timestamp}.png`;
      const imagePath = join(imagesDir, newImageFilename);
      writeFileSync(imagePath, imageBuffer);

      // 古い画像パスを新しい画像に置換
      if (sectionIndex >= 0 && sectionIndex < sections.length && sections[sectionIndex].image) {
        const oldImageName = sections[sectionIndex].image;
        htmlContent = htmlContent.replace(
          new RegExp(`src="[^"]*${oldImageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
          `src="../blog-images/${newImageFilename}"`
        );
      } else {
        // 画像がない場合はh2の後に追加
        const section = sections[sectionIndex];
        if (section) {
          htmlContent = htmlContent.replace(
            `<h2>${section.heading}</h2>`,
            `<h2>${section.heading}</h2>\n        <img src="../blog-images/${newImageFilename}" alt="${section.heading}" style="width: 100%; max-width: 800px; height: auto; border-radius: 10px; margin: 2rem auto; display: block;">`
          );
        }
      }

      console.log(`✅ 新しい画像を保存: ${newImageFilename}`);
    }
  }

  // 更新したHTMLを保存
  writeFileSync(blogPath, htmlContent);
  console.log(`\n✅ ブログ記事を更新しました: ${blogFilename}`);

  // 編集情報をJSONで出力
  const editInfo = {
    filename: blogFilename,
    editType,
    sectionIndex,
    editPrompt,
    imagePrompt,
    characterName,
    editedAt: new Date().toISOString()
  };

  const infoPath = join(__dirname, '..', 'output', 'blog-edit-info.json');
  writeFileSync(infoPath, JSON.stringify(editInfo, null, 2));

  return editInfo;
}

// 実行
editBlog().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
