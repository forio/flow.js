Test: 
readonly mode
batch subscriptions
prefetch variables
silent
interpolation

- Run channel with init operation @done
- Run channel with silent init operation (pre-fetching shouldn't happen)


Prefetch
PAssing to operations vs variable channel
    


publish  -> save -> refresh -> notify

#publish 
    - normalizes arguments
    - errors if readonly
    - does interpolation

    - Saves

#refresh
    <Force-pull from the server & notify>
    - Checks if silent
    - fetches
    - notify()

#notify
    <Notify everyone without actually saving>
    - finds listeners and updates
    - Checks if `batch`


#subscribe
    - Determines if needed to get data AT ONCE for topics



Option 1:

Create a central subscription manager which supports batch/pre-fetch etc
Plug in different 'data sources' - variables/ run etc.
Central channel manages *all* subscriptions

Option 2:
Make each channel inherit from the same subscription manager, and override publish/subs as required. This mean it keeps track of their own subscriptions



