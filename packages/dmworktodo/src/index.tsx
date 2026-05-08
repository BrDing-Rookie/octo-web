// @octo/todo — Matter module for dmwork web

// Module
export { default as MatterModule } from './module';

// Pages
export { default as MatterPage } from './pages/TodoPage';

// UI Components
export { default as MatterStatusBadge } from './ui/TodoStatusBadge';
export { default as MatterCard } from './ui/TodoCard';
export { default as MatterFilterBar } from './ui/TodoFilterBar';
export { default as MemberPicker } from './ui/MemberPicker';
export { default as DetailPanel } from './ui/DetailPanel';
export { default as CreateTaskModal } from './ui/CreateTaskModal';

// Chat Integration
export { default as ChatMatterPanel } from './panel/ChatTodoPanel';

// Types
export * from './bridge/types';

// API
export * as matterApi from './api/todoApi';
