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

def function_with_whitespace():
    dec = decisions.teamDecisions[vars.currentRound]

    if dec: # if the dictionary for this round is not empty
        for key in dec:
            if (dec[key].consequence == True): # if the decision has in-sim consequences
                for i in range(len(dec[key].optionsText)):
                    if (dec[key].optionsSelected[i] == True): # if the option is selected, apply the handler function
                        dec[key].optionsHandlers[i]()                   

    # ------- save everything
    Epicenter.record('vars.on60Day', vars.on60Day)
    Epicenter.record('vars.schedule', vars.schedule)
    Epicenter.record('vars.nar', vars.nar)
    Epicenter.record('vars.esi', vars.esi)
    Epicenter.record('decisions.teamDecisions', decisions.teamDecisions)
    Epicenter.record('vars.metrics', vars.metrics)
    Epicenter.record('vars.contract', vars.contract)
    Epicenter.record('memos.memos', memos.memos) # these may have had their .condition updated by changes to the above (nar, esi, contract, decisions)
