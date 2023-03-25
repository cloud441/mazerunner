from mazerunner.MazeGenerator.maze_generator import MazeGenerator


def test_maze_generator_init():
    maze_generator = MazeGenerator()
    assert maze_generator.maze.get_board() == [[0 for _ in range(10)] for _ in range(10)]
