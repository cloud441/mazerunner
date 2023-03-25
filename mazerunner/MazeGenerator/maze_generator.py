from mazerunner.MazeGenerator.maze import Maze


class MazeGenerator:
    def __init__(self, size: int = 10):
        self.maze = Maze(size=size)

    def generate_maze(self, size: int) -> Maze:
        return self.maze
