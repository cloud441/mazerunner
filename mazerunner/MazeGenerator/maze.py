import numpy as np


class Maze:
    def __init__(self, height: int, width: int):
        self.board = np.ones((height, width), dtype=np.int8)
        self.board[1:height - 1, 1:width - 1] = 0

    def __getitem__(self, x: int, y: int) -> int:
        return self.board[x, y]

    def __setitem__(self, x: int, y: int, value: int):
        self.board[x, y] = value

    def get_board(self) -> np.array:
        return self.board

    def __str__(self):
        str_board = ""
        for row in self.board:
            for cell in row:
                str_board += str(cell) + " "
            str_board += "\n"
        return str_board
