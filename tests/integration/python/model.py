
from epicenter import Epicenter

tempVar = 15

anotherTempVar = [	
	'preAward1', 'preAward2', 'preAward3', 'preAward4', 
	'award1', 
	'postAward1A', 'postAward1B', 'postAward2', 'postAward3', 'postAward4', 'postAward5', 'postAward6'
]


def saveDecisions():
	Epicenter.record('tempVar', tempVar)


# this method will not run! only being used for testing Flow Inspector
def applyDecisions():
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

