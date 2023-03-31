from typing import List
from enum import Enum
from copy import deepcopy
import random

import matplotlib.pyplot as plt
from matplotlib import animation

from mazerunner.MazeGenerator.maze import Maze


class Direction(Enum):
    UP = 1
    DOWN = 2
    LEFT = 3
    RIGHT = 4

class GenerationAlgoEnum(str, Enum):
    RECURSIVE_BT = "recursive_backtracking"


class MazeGenerator:
    def __init__(self):
        self.height = 2
        self.width = 2
        self.maze: Maze = Maze(2, 2)
        self.generation_steps: List[Maze] = []

    def generate_maze(
        self,
        algorithm: GenerationAlgoEnum,
        height: int = 10,
        width: int = 10,
        show_steps: bool = False,
    ) -> Maze:
        self.height = height + (height % 2 == 0)
        self.width = width + (width % 2 == 0)
        self.maze = Maze(height=self.height, width=self.width)
        self.generation_steps.append(deepcopy(self.maze))

        if algorithm == GenerationAlgoEnum.RECURSIVE_BT:
            self.generate_recursive_backtracking()

        if show_steps:
            self.animate_steps()

        return self.maze

    def generate_recursive_backtracking(self):
        # build a checkerboard before backtracking:

        for i in range(self.height):
            for j in range(self.width):
                if i % 2 == 1 or j % 2 == 1:
                    self.maze[(i, j)] = 0
                else:
                    self.maze[(i, j)] = 1
                if i == 0 or j == 0 or i == self.height - 1 or j == self.width - 1:
                    self.maze[(i, j)] = 2
        self.generation_steps.append(deepcopy(self.maze))

        sx = random.choice(range(2, self.width - 2, 2))
        sy = random.choice(range(2, self.height - 2, 2))

        self.recursive_backtracking_step(sx, sy)
        for i in range(self.height):
            for j in range(self.width):
                if self.maze[(i, j)] == 2:
                    self.maze[(i, j)] = 1

        self.maze[(1, 2)] = 1
        self.generation_steps.append(deepcopy(self.maze))

        self.maze[(self.height - 2, self.width - 3)] = 1
        self.generation_steps.append(deepcopy(self.maze))

    def recursive_backtracking_step(
        self,
        cx: int,
        cy: int,
    ):
        self.maze[(cy, cx)] = 2
        self.generation_steps.append(deepcopy(self.maze))


        if self.maze[(cy - 2, cx)] == 2 and self.maze[(cy + 2, cx)] == 2 and self.maze[(cy, cx - 2)] == 2 and self.maze[(cy, cx + 2)] == 2:
            pass
        else:
            li = [1, 2, 3, 4]
            while len(li) > 0:
                dir = random.choice(li)
                li.remove(dir)

                if dir == Direction.UP.value:
                    ny = cy - 2
                    my = cy - 1
                elif dir == Direction.DOWN.value:
                    ny = cy + 2
                    my = cy + 1
                else:
                    ny = cy
                    my = cy

                if dir == Direction.LEFT.value:
                    nx = cx - 2
                    mx = cx - 1
                elif dir == Direction.RIGHT.value:
                    nx = cx + 2
                    mx = cx + 1
                else:
                    nx = cx
                    mx = cx

                if self.maze[(ny, nx)] != 2:
                    self.maze[(my, mx)] = 2
                    self.generation_steps.append(deepcopy(self.maze))
                    self.recursive_backtracking_step(nx, ny)

    def animate_steps(self):
        fig = plt.figure()
        frames = [
            [plt.imshow(
                1 - maze.get_board(),
                cmap="gray",
                animated=True,
            )] for maze in self.generation_steps
        ]

        anim = animation.ArtistAnimation(
            fig,
            frames,
            interval=10,
            blit=True,
        )
        plt.show()
