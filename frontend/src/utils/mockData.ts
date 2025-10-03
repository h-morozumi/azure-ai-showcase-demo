import type { Demo } from '../types/demo';

/**
 * デモのモックデータ
 */
export const mockDemos: Demo[] = [
  {
    id: 'speech-to-text',
    title: '音声認識 (Speech to Text)',
    description: 'Azure Speech Service を使用してリアルタイムで音声をテキストに変換します。',
    image: 'https://via.placeholder.com/400x250/4A90E2/FFFFFF?text=Speech+to+Text',
    tags: ['Speech Service'],
    path: '/speech-to-text',
  },
  {
    id: 'text-to-speech',
    title: '音声合成 (Text to Speech)',
    description: 'テキストを自然な音声に変換し、様々な言語と音声スタイルをサポートします。',
    image: 'https://via.placeholder.com/400x250/50C878/FFFFFF?text=Text+to+Speech',
    tags: ['Speech Service'],
    path: '/text-to-speech',
  },
  {
    id: 'document-analysis',
    title: 'ドキュメント解析',
    description: 'Document Intelligence を使用してPDFやドキュメントから情報を抽出します。',
    image: 'https://via.placeholder.com/400x250/FF6B6B/FFFFFF?text=Document+Analysis',
    tags: ['Document Intelligence'],
    path: '/document-analysis',
  },
  {
    id: 'form-recognizer',
    title: 'フォーム認識',
    description: 'フォームやレシートから構造化データを自動抽出します。',
    image: 'https://via.placeholder.com/400x250/FFA500/FFFFFF?text=Form+Recognizer',
    tags: ['Document Intelligence'],
    path: '/form-recognizer',
  },
  {
    id: 'llm-chat',
    title: 'LLM チャット',
    description: 'Azure OpenAI Service を使用した対話型AIチャットボットです。',
    image: 'https://via.placeholder.com/400x250/9370DB/FFFFFF?text=LLM+Chat',
    tags: ['OpenAI Service', 'AI Foundry'],
    path: '/llm-chat',
  },
  {
    id: 'ai-agent',
    title: 'AI Agent',
    description: 'AI Foundry で構築された自律的なAIエージェントのデモです。',
    image: 'https://via.placeholder.com/400x250/20B2AA/FFFFFF?text=AI+Agent',
    tags: ['AI Foundry'],
    path: '/ai-agent',
  },
  {
    id: 'multimodal-analysis',
    title: 'マルチモーダル分析',
    description: '画像とテキストを組み合わせた高度な分析を行います。',
    image: 'https://via.placeholder.com/400x250/FF69B4/FFFFFF?text=Multimodal+Analysis',
    tags: ['OpenAI Service', 'AI Foundry'],
    path: '/multimodal-analysis',
  },
  {
    id: 'conversation-transcription',
    title: '会話文字起こし',
    description: '複数話者の会話を認識し、話者を識別しながら文字起こしを行います。',
    image: 'https://via.placeholder.com/400x250/FFD700/FFFFFF?text=Conversation+Transcription',
    tags: ['Speech Service'],
    path: '/conversation-transcription',
  },
];
