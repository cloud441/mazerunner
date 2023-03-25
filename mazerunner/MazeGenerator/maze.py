class Maze:
    def __init__(self, size: int):
        self.board = [[0 for _ in range(size)] for _ in range(size)]

    def get_board(self):
        return self.board

    def print_board(self):
        for row in self.board:
            for cell in row:
                print(cell, end=" ")
            print()
