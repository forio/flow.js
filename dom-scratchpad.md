DOM-Attacher
    Responsiblitites:
        #Attach dom node to the channel api
        Attach match dom nodes to the right handlers

    - Get all Elements with a f- property = els
    - Get all registered generators = gens

    - Match el:gen
    - Initialize gen with that element
    - Give leftovers to default generator

    Watch for new elements being added and rinse/repeat
    Watch for elements being removed and remove from generator

    Register element with channel
        - Needs to know which model variables to bind to

Generator:
    Responsiblities:
        Know your node
        Broadcast message when your nide changes

    - Be able to claim elements you're interested in
    - Know how to attach change events to your elements

    - Know how to update your elements with new values
    - Know how to update attributes with new values


    :test
    :claim

    :getModelVariablesToListenFor

    :handleModelVariableUpdate(modelVariable)
        - See which property this variable has been bound to
        ?? Update property
            - have {'property': [attributes]}
            - UpdateHandler.update(attribute, value)


UpdateHandler
    update:
        this.handlers[attribute](value)

