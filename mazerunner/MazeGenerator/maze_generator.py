from mazerunner.MazeGenerator.maze import Maze
from enum import Enum


class GenerationAlgoEnum(str, Enum):
    RECURSIVE_BT = "recursive_backtracking"


class MazeGenerator:
    def __init__(self):
        self.height = 2
        self.width = 2
        self.maze: Maze = Maze(2, 2)

    def generate_maze(self, algorithm: GenerationAlgoEnum, height: int = 10, width: int = 10) -> Maze:
        self.height = height
        self.width = width
        self.maze = Maze(height=height, width=width)

        if algorithm == GenerationAlgoEnum.RECURSIVE_BT:
            self.generate_recursive_backtracking()

        return self.maze

    def generate_recursive_backtracking(self):
        # build a checkerboard before backtracking:
        for i in range(self.height):
            for j in range(self.width):
                if i % 2 == 1 or j % 2 == 1:
                    self.maze[i, j] = 0
                else:
                    self.maze[i, j] = 1
