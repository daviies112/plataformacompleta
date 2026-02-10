import { useNavigate } from 'react-router-dom';
import { useNotionStore } from '@/stores/notionStore';
import Boards from './Boards';

const BoardsWrapper = () => {
  const navigate = useNavigate();
  const { boards, addBoard, setCurrentBoard } = useNotionStore();

  const handleCreateBoard = (title: string): string => {
    const newBoardId = addBoard(title);
    return newBoardId;
  };

  const handleSelectBoard = (boardId: string) => {
    setCurrentBoard(boardId);
  };

  return (
    <Boards
      boards={boards}
      onCreateBoard={handleCreateBoard}
      onSelectBoard={handleSelectBoard}
    />
  );
};

export default BoardsWrapper;
