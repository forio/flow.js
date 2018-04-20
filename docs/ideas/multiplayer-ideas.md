
#Multiplayer

##Mirror Mode
    Mirror mode {
        nav: true,
        focus: true
            - Show circles of users on top. 
                + Green dot if online
                + Opacity if they're on your page
                + Circle their avatar next to decision field if they're editing the same decision
                + Hover over icon to see which page they're on
                    * Parse dom to get label for hash
                - Style with css variables for icon/text etc?
    }

## World Channel
        world:users
        world:role
        world:run:variables:price

        foreach: 
            world:users
            world:<userid>:role
            world:<userid>:isOnline
            world:me:role

##User Channel
    - user:channel
        user:isLoggedin
        user:Name
        <if multipler, gets extra props>
        user:role
        user:isOnline
        user:<userid>:role
        user:<userid>:isonline

        defaults to '<currentuserid>', can also be <userid>

##Presence
presence list
```html
<ul data-f-foreach="user in users | reject('isMe')">
    <li data-f-class="users:<% user.id %>:isOnline | ifTrue('online')"><%= user.name %></li>
</ul>
```
Make the users channel aware of if it's a multiplayer game or not.

```html
<ul data-f-foreach="user in group:users | reject('isFacilitator')">
    <li data-f-class="user:<% user.id %>:isOnline | ifTrue('online')"><%= user.name %></li>
</ul>
```

- Listen on either group channel or world channel for online/offline notifications
    ? Why not always the group channel?
