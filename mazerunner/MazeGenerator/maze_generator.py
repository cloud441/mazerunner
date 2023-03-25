from mazerunner.MazeGenerator.maze import Maze


class MazeGenerator:
    def __init__(self):
        self.maze = Maze(10)

    def generate_maze(self, size: int) -> Maze:
        return self.maze
