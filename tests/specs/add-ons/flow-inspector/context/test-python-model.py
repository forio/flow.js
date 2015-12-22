"""For the portfolio management challenge contest
"""

import numpy as np

def normal_function(func):
    x = 1
    y = 2
    return x + y

def normal_function_parent(func):
    """Decorator to ensure calculation occurs whenever a fields are set
    """
    def wrapper(*args):
        """Actual calculation, then calls the decorated function
        """
        func(*args)
        args[0].calculate()
    return wrapper


class Portfolio(object):
    """Portfolio for the Probability Management Contest
    """
    def function_within_class(self):
        self._historic = np.genfromtxt('historic_data.csv', delimiter='\t')
        self.rands = np.genfromtxt('rand_by_year.csv', delimiter='\t',
                                   dtype=int) - 1

        self.correlation = self.calculate_correlation()

        self.calculate()

    @property
    def property(self):
        return self._global_bonds

    @global_bonds.setter
    @calculate
    def global_var(self, value):
        self.global_var = value


my_float = float(7)
multi_line_dict = {
    "key1": 1,
    "key2": 2,
    "key3": 3,
}

portfolio = Portfolio()
