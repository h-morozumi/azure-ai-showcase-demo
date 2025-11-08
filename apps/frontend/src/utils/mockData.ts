import type { Demo } from '../types/demo';

/**
 * デモのモックデータ
 */
export const mockDemos: Demo[] = [
  {
    id: 'speech-avatar-live',
    title: 'リアルタイムアバター会話デモ',
    description: 'Voice Live API とテキスト読み上げアバターでリアルタイム会話体験を提供します。',
    image: '/images/demo-speech-avatar.svg',
    tags: ['Speech Service', 'Avator', 'OpenAI'],
    path: '/speech-avatar-demo',
  },
  {
    id: 'speech-to-text',
    title: '音声認識 (Speech to Text)',
    description: 'Azure Speech Service を使用してリアルタイムで音声をテキストに変換します。',
    image: '/images/demo-speech-to-text.svg',
    tags: ['Speech Service'],
    path: '/speech-to-text',
  },
  {
    id: 'text-to-speech',
    title: '音声合成 (Text to Speech)',
    description: 'テキストを自然な音声に変換し、様々な言語と音声スタイルをサポートします。',
    image: '/images/demo-text-to-speech.svg',
    tags: ['Speech Service'],
    path: '/text-to-speech',
  },
  {
    id: 'document-analysis',
    title: 'ドキュメント解析',
    description: 'Document Intelligence を使用してPDFやドキュメントから情報を抽出します。',
    image: '/images/demo-document-analysis.svg',
    tags: ['Document Intelligence'],
    path: '/document-analysis',
  },
  {
    id: 'form-recognizer',
    title: 'フォーム認識',
    description: 'フォームやレシートから構造化データを自動抽出します。',
    image: '/images/demo-form-recognizer.svg',
    tags: ['Document Intelligence'],
    path: '/form-recognizer',
  },
  {
    id: 'llm-chat',
    title: 'LLM チャット',
    description: 'Azure OpenAI Service を使用した対話型AIチャットボットです。',
    image: '/images/demo-llm-chat.svg',
    tags: ['OpenAI Service', 'AI Foundry'],
    path: '/llm-chat',
  },
  {
    id: 'ai-agent',
    title: 'AI Agent',
    description: 'AI Foundry で構築された自律的なAIエージェントのデモです。',
    image: '/images/demo-ai-agent.svg',
    tags: ['AI Foundry'],
    path: '/ai-agent',
  },
  {
    id: 'multimodal-analysis',
    title: 'マルチモーダル分析',
    description: '画像とテキストを組み合わせた高度な分析を行います。',
    image: '/images/demo-multimodal.svg',
    tags: ['OpenAI Service', 'AI Foundry'],
    path: '/multimodal-analysis',
  },
  {
    id: 'conversation-transcription',
    title: '会話文字起こし',
    description: '複数話者の会話を認識し、話者を識別しながら文字起こしを行います。',
    image: '/images/demo-conversation.svg',
    tags: ['Speech Service'],
    path: '/conversation-transcription',
  },
];
