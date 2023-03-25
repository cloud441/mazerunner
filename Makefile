SRC_DIR := mazerunner
TEST_DIR := tests


lint:
	python -m black ${SRC_DIR} ${TEST_DIR}
	python -m mypy ${SRC_DIR}

test:
	python -m pytest ${TEST_DIR}